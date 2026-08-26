const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = express.Router();
const User = mongoose.model('User');
const JWT_SECRET = process.env.JWT_SECRET;

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      token, 
      user: { id: newUser._id, username: newUser.username, hasAnilistToken: false } 
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        hasAnilistToken: !!user.anilistToken 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: "Server error during login" });
  }
});

// Link AniList Token (encrypt and save)
const { encrypt, decrypt } = require('../utils/crypto');

router.post('/link-anilist', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);

    const { anilistToken } = req.body;
    if (!anilistToken) return res.status(400).json({ error: 'No AniList token provided' });

    const encryptedToken = encrypt(anilistToken);
    await User.findByIdAndUpdate(decoded.id, { anilistToken: encryptedToken });

    res.json({ message: 'AniList account linked successfully!', hasAnilistToken: true });
  } catch (err) {
    console.error('Link AniList error:', err);
    res.status(500).json({ error: 'Failed to link AniList account' });
  }
});

// Get decrypted AniList token (for frontend sync calls)
router.get('/anilist-token', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || !user.anilistToken) {
      return res.json({ anilistToken: null });
    }

    const decryptedToken = decrypt(user.anilistToken);
    res.json({ anilistToken: decryptedToken });
  } catch (err) {
    console.error('Get AniList token error:', err);
    res.status(500).json({ error: 'Failed to retrieve AniList token' });
  }
});

// Unlink AniList account
router.delete('/unlink-anilist', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);

    await User.findByIdAndUpdate(decoded.id, { anilistToken: null });
    res.json({ message: 'AniList account unlinked', hasAnilistToken: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlink AniList' });
  }
});

module.exports = router;
