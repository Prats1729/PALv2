require('dotenv').config(); // Loads variables from .env file
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Mongoose helps us talk to MongoDB

const app = express();
const PORT = process.env.PORT || 5000;

// --- Security & Middleware ---
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Helmet adds secure HTTP headers (XSS filter, frameguard, etc.)
app.use(helmet());

const ALLOWED_ORIGINS = [
  'https://palv2.vercel.app',
  'https://palv2.onrender.com',
  'tauri://localhost',
  'https://tauri.localhost',
  'http://tauri.localhost',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

// CORS restricted to allowed domains + native clients
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting: general API limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', generalLimiter);

// Auth limiter for sensitive routes (login / register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Strict limiter for forgot password requests
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' }
});
app.use('/api/auth/forgot-password', forgotPasswordLimiter);

// Granular body parser limits: 3mb for avatar uploads, 1mb default
app.use('/api/auth/avatar', express.json({ limit: '3mb' }));
app.use(express.json({ limit: '1mb' }));

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
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String, required: false }, // Optional if authenticated solely via AniList OAuth
  avatar: { type: String, default: null }, // Custom image (base64/data URL) or preset URL
  anilistId: { type: Number, unique: true, sparse: true },
  anilistToken: { type: String, default: null }, // Encrypted token
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// A Schema defines what a Watchlist Item should look like in the database.
const watchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  animeId: { type: Number, required: true },
  title: { type: String, required: true },
  coverImage: { type: String, required: true },
  bannerImage: { type: String, default: null },
  color: { type: String, default: "#6366f1" },
  status: { type: String, default: "Plan to Watch" },
  progress: { type: Number, default: 0 },
  totalEpisodes: { type: Number, default: null },
  lastPosition: { type: Number, default: 0 },
  lastDuration: { type: Number, default: 0 },
  lastPercent: { type: Number, default: 0 },
  lastWatchedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
  addedAt: { type: Date, default: Date.now }
});
watchlistSchema.index({ userId: 1, lastWatchedAt: -1 });

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
    const list = await Watchlist.find({ userId: req.user.id }).sort({ lastWatchedAt: -1, updatedAt: -1, addedAt: -1 }); 
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// 2. POST Request: Save a new anime to MongoDB
app.post('/api/watchlist', authMiddleware, async (req, res) => {
  const { id, title, coverImage, bannerImage, color, status, totalEpisodes, progress, rating, lastWatchedAt } = req.body;
  
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
      bannerImage: bannerImage || null,
      color,
      status,
      totalEpisodes,
      progress: progress || 0,
      rating,
      lastWatchedAt: lastWatchedAt ? new Date(lastWatchedAt) : null,
      updatedAt: new Date()
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
    const paramId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(paramId);
    const query = isObjectId
      ? { $or: [{ _id: paramId }, { animeId: Number(paramId) || -1 }], userId: req.user.id }
      : { animeId: Number(paramId), userId: req.user.id };

    const updatePayload = {
      ...req.body,
      updatedAt: new Date()
    };

    // Protect immutable identity keys
    delete updatePayload._id;
    delete updatePayload.userId;
    delete updatePayload.animeId;

    if (req.body.lastWatchedAt !== undefined) {
      updatePayload.lastWatchedAt = req.body.lastWatchedAt ? new Date(req.body.lastWatchedAt) : null;
    }

    const updatedAnime = await Watchlist.findOneAndUpdate(
      query,
      { $set: updatePayload },
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
    const paramId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(paramId);
    const query = isObjectId
      ? { $or: [{ _id: paramId }, { animeId: Number(paramId) || -1 }], userId: req.user.id }
      : { animeId: Number(paramId), userId: req.user.id };

    const deletedAnime = await Watchlist.findOneAndDelete(query);
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
const { importAniListWatchlist } = require('./utils/anilistImporter');

app.post('/api/watchlist/import-anilist', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.anilistToken) {
      return res.status(400).json({ error: "No AniList account linked" });
    }

    const anilistToken = decrypt(user.anilistToken);
    const { imported, updated, total } = await importAniListWatchlist(req.user.id, anilistToken, Watchlist);

    res.json({ 
      message: `Sync complete! Synced ${total} anime (${imported} new, ${updated} updated).` 
    });
  } catch (err) {
    console.error("Import AniList error:", err);
    res.status(500).json({ error: err.message || "Failed to import AniList watchlist" });
  }
});

// --- Start the Server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://127.0.0.1:${PORT}`);
});
