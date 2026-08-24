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
// A Schema defines what a Watchlist Item should look like in the database.
const watchlistSchema = new mongoose.Schema({
  animeId: { type: Number, required: true },
  title: { type: String, required: true },
  status: { type: String, default: "Plan to Watch" },
  addedAt: { type: Date, default: Date.now }
});
// Create the Model based on the Schema
const Watchlist = mongoose.model('Watchlist', watchlistSchema);

// --- PAL API Routes (Now connected to MongoDB!) ---

// 1. GET Request: Fetch the real watchlist from MongoDB
// We use 'async' because talking to a database takes time (it returns a Promise).
app.get('/api/watchlist', async (req, res) => {
  try {
    // Watchlist.find() asks MongoDB for all items in this collection
    const list = await Watchlist.find(); 
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// 2. POST Request: Save a new anime to MongoDB
app.post('/api/watchlist', async (req, res) => {
  const { id, title, status } = req.body;
  
  if (!id || !title) {
    return res.status(400).json({ error: "Missing anime id or title" });
  }

  try {
    // Check if it already exists so we don't add duplicates
    const existingAnime = await Watchlist.findOne({ animeId: id });
    if (existingAnime) {
      return res.status(400).json({ error: "Anime is already in your watchlist!" });
    }

    // Create and save directly to MongoDB
    const newAnime = await Watchlist.create({
      animeId: id,
      title: title,
      status: status || "Plan to Watch"
    });
    
    // Send back success and the newly created document
    res.status(201).json({ 
      message: "Anime added successfully!",
      anime: newAnime 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save to database" });
  }
});

// --- Database Connection ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas!'))
  .catch((err) => console.error('❌ Failed to connect to MongoDB:', err));

// --- Start the Server ---
// This makes the server actively listen for incoming requests on the specified port.
app.listen(PORT, () => {
  console.log(`PAL Backend Server is running on http://localhost:${PORT}`);
});
