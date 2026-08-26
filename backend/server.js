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

// --- Start the Server ---
// This makes the server actively listen for incoming requests on the specified port.
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
