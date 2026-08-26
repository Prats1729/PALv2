require('dotenv').config(); // Loads variables from .env file
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Mongoose helps us talk to MongoDB

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// CORS (Cross-Origin Resource Sharing) allows your React frontend 
// to make requests to this backend without browser security errors.
app.use(cors());
// express.json() allows your server to read JSON data sent in the request body.
app.use(express.json());

// --- Routes ---
// This is a basic route. When a user or frontend visits http://localhost:5000/api/health
// the server responds with a JSON message.
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Hello from the PAL Backend!' 
  });
});

// --- Database Model (Schema) ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  anilistToken: { type: String, default: null } // Encrypted token
});
const User = mongoose.model('User', userSchema);

// A Schema defines what a Watchlist Item should look like in the database.
const watchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  animeId: { type: Number, required: true },
  title: { type: String, required: true },
  coverImage: { type: String, required: true },
  color: { type: String, default: "#6366f1" },
  status: { type: String, default: "Plan to Watch" },
  progress: { type: Number, default: 0 },
  totalEpisodes: { type: Number, default: null },
  rating: { type: Number, default: null },
  addedAt: { type: Date, default: Date.now }
});
// Create the Model based on the Schema
const Watchlist = mongoose.model('Watchlist', watchlistSchema);

// --- Database Connection ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas!'))
  .catch((err) => console.error('❌ Failed to connect to MongoDB:', err));

// --- Routes Import ---
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

app.use('/api/auth', authRoutes);

// --- PAL API Routes (Now connected to MongoDB!) ---

// 1. GET Request: Fetch the real watchlist from MongoDB
app.get('/api/watchlist', authMiddleware, async (req, res) => {
  try {
    const list = await Watchlist.find({ userId: req.user.id }); 
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// 2. POST Request: Save a new anime to MongoDB
app.post('/api/watchlist', authMiddleware, async (req, res) => {
  const { id, title, coverImage, color, status, totalEpisodes, progress, rating } = req.body;
  
  if (!id || !title || !coverImage) {
    return res.status(400).json({ error: "Missing required fields (id, title, coverImage)" });
  }

  try {
    const existingAnime = await Watchlist.findOne({ animeId: id, userId: req.user.id });
    if (existingAnime) {
      return res.status(400).json({ error: "Anime is already in your watchlist!" });
    }

    const newItem = new Watchlist({
      userId: req.user.id,
      animeId: id,
      title,
      coverImage,
      color,
      status,
      totalEpisodes,
      progress,
      rating
    });
    
    await newItem.save();
    res.status(201).json({ message: "Anime added successfully!", anime: newItem });
  } catch (err) {
    res.status(500).json({ error: "Failed to save anime" });
  }
});

// 3. PUT Request: Update an existing anime
app.put('/api/watchlist/:id', authMiddleware, async (req, res) => {
  try {
    const updatedAnime = await Watchlist.findOneAndUpdate(
      { animeId: Number(req.params.id), userId: req.user.id },
      { $set: req.body },
      { returnDocument: 'after' }
    );
    
    if (!updatedAnime) {
      return res.status(404).json({ error: "Anime not found in your watchlist" });
    }
    res.json({ message: "Updated successfully!", anime: updatedAnime });
  } catch (err) {
    res.status(500).json({ error: "Failed to update anime" });
  }
});

// 4. DELETE Request: Remove an anime from the database
app.delete('/api/watchlist/:id', authMiddleware, async (req, res) => {
  try {
    const deletedAnime = await Watchlist.findOneAndDelete({ animeId: Number(req.params.id), userId: req.user.id });
    if (!deletedAnime) {
      return res.status(404).json({ error: "Anime not found in your watchlist" });
    }
    res.json({ message: "Anime removed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete anime" });
  }
});

// 5. POST: Import entire AniList watchlist into PALv2
const { decrypt } = require('./utils/crypto');

const ANILIST_STATUS_MAP = {
  CURRENT: "Watching",
  COMPLETED: "Completed",
  PAUSED: "On Hold",
  DROPPED: "Dropped",
  PLANNING: "Plan to Watch",
  REPEATING: "Watching",
};

app.post('/api/watchlist/import-anilist', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.anilistToken) {
      return res.status(400).json({ error: "No AniList account linked" });
    }

    const anilistToken = decrypt(user.anilistToken);

    // Query AniList for the authenticated user's full anime list
    const query = `
      query {
        Viewer {
          id
          mediaListOptions { scoreFormat }
        }
      }
    `;
    const viewerRes = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anilistToken}`,
      },
      body: JSON.stringify({ query }),
    });
    const viewerJson = await viewerRes.json();
    if (viewerJson.errors) {
      return res.status(400).json({ error: "AniList token expired or invalid" });
    }
    const viewerId = viewerJson.data.Viewer.id;

    // Now fetch the full list
    const listQuery = `
      query ($userId: Int) {
        MediaListCollection(userId: $userId, type: ANIME) {
          lists {
            status
            entries {
              progress
              score(format: POINT_10_DECIMAL)
              media {
                id
                title { english romaji }
                coverImage { large color }
                episodes
              }
            }
          }
        }
      }
    `;
    const listRes = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anilistToken}`,
      },
      body: JSON.stringify({ query: listQuery, variables: { userId: viewerId } }),
    });
    const listJson = await listRes.json();
    if (listJson.errors) {
      return res.status(400).json({ error: "Failed to fetch AniList data" });
    }

    const lists = listJson.data.MediaListCollection.lists;
    let imported = 0;
    let updated = 0;
    const activeAniListIds = [];

    for (const list of lists) {
      const palStatus = ANILIST_STATUS_MAP[list.status] || "Plan to Watch";
      
      for (const entry of list.entries) {
        const media = entry.media;
        activeAniListIds.push(media.id);
        
        const updateData = {
          userId: req.user.id,
          animeId: media.id,
          title: media.title.english || media.title.romaji || "Unknown",
          coverImage: media.coverImage.large,
          color: media.coverImage.color || "#6366f1",
          status: palStatus,
          progress: entry.progress || 0,
          totalEpisodes: media.episodes || null,
          rating: entry.score || null,
        };

        const result = await Watchlist.findOneAndUpdate(
          { animeId: media.id, userId: req.user.id },
          { $set: updateData },
          { upsert: true, new: false } // 'new: false' means it returns the old document if it existed
        );

        if (result) {
          updated++;
        } else {
          imported++;
        }
      }
    }

    // Delete any anime in PALv2 that are no longer in AniList
    const deleteResult = await Watchlist.deleteMany({
      userId: req.user.id,
      animeId: { $nin: activeAniListIds }
    });

    res.json({ 
      message: `Sync complete! Added ${imported}, updated ${updated}, and removed ${deleteResult.deletedCount} deleted anime.` 
    });
  } catch (err) {
    console.error("Import AniList error:", err);
    res.status(500).json({ error: "Failed to import AniList watchlist" });
  }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
