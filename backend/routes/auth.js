const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/crypto');
const { importAniListWatchlist } = require('../utils/anilistImporter');

const router = express.Router();
const User = mongoose.model('User');
const Watchlist = mongoose.model('Watchlist');
const JWT_SECRET = process.env.JWT_SECRET;

// 0. Verify Session / Current User
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'No authorization token' });

    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        hasAnilistToken: !!user.anilistToken
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
});

// 1. Register Route (with Email and Password Confirmation)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Validate email format if provided
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }

      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
    }

    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username: username.trim(),
      email: cleanEmail,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      token, 
      user: { 
        id: newUser._id, 
        username: newUser.username, 
        email: newUser.email,
        hasAnilistToken: false 
      } 
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// 2. Login Route (Accepts Username OR Email)
router.post('/login', async (req, res) => {
  try {
    const { username, identifier, password } = req.body;
    const loginKey = (identifier || username || '').trim();

    if (!loginKey || !password) {
      return res.status(400).json({ error: "Username/Email and password are required" });
    }

    // Search by username OR email
    const user = await User.findOne({
      $or: [
        { username: loginKey },
        { email: loginKey.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid username/email or password" });
    }

    if (!user.password) {
      return res.status(400).json({ 
        error: "This account was created via AniList. Please click 'Sign in with AniList' to log in." 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid username/email or password" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        hasAnilistToken: !!user.anilistToken 
      } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// 3. 1-Click "Sign in with AniList" (OAuth Login / Auto-Registration)
router.post('/anilist-login', async (req, res) => {
  try {
    const { anilistToken } = req.body;
    if (!anilistToken) {
      return res.status(400).json({ error: "No AniList access token provided" });
    }

    // Verify token & fetch user profile directly from AniList GraphQL
    const anilistRes = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        Authorization: `Bearer ${anilistToken}`
      },
      body: JSON.stringify({
        query: `
          query {
            Viewer {
              id
              name
              avatar {
                large
              }
            }
          }
        `
      })
    });

    const anilistData = await anilistRes.json();
    if (anilistData.errors || !anilistData.data?.Viewer) {
      console.error("AniList Viewer validation failed:", JSON.stringify(anilistData));
      return res.status(400).json({ error: anilistData.errors?.[0]?.message || "Invalid or expired AniList authorization token" });
    }

    const viewer = anilistData.data.Viewer;
    const encryptedToken = encrypt(anilistToken);

    // Find existing user by anilistId or username
    let user = await User.findOne({
      $or: [
        { anilistId: viewer.id },
        { username: viewer.name }
      ]
    });

    if (user) {
      // Update linked token & anilistId
      user.anilistId = viewer.id;
      user.anilistToken = encryptedToken;
      await user.save();
    } else {
      // Auto-create new PALv2 user from AniList profile
      user = new User({
        username: viewer.name,
        anilistId: viewer.id,
        anilistToken: encryptedToken
      });
      await user.save();
    }

    // Auto-sync entire AniList watchlist in MongoDB for this user
    try {
      await importAniListWatchlist(user._id, anilistToken, Watchlist);
    } catch (syncErr) {
      console.warn("Initial AniList watchlist sync note:", syncErr.message);
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        hasAnilistToken: true,
        avatar: viewer.avatar?.large
      }
    });
  } catch (err) {
    console.error("AniList login error:", err);
    res.status(500).json({ error: "Failed to authenticate with AniList" });
  }
});

// 4. Request Password Reset Token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Please enter your registered email address" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // For security, always respond with success message so emails cannot be enumerated
      return res.json({ 
        message: "If an account exists with this email, password reset instructions have been generated." 
      });
    }

    // Generate secure 32-byte hex token valid for 1 hour
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Log the generated reset code for local development & return confirmation
    console.log(`🔑 Password Reset Token for ${user.username} (${user.email}): ${resetToken}`);

    res.json({
      message: "If an account exists with this email, password reset instructions have been generated.",
      devToken: resetToken // Provided for local convenience
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
});

// 5. Submit New Password with Reset Token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Password reset token is invalid or has expired" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Your password has been successfully reset! You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Link AniList Token (encrypt and save)
router.post('/link-anilist', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'No token' });

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

    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);

    await User.findByIdAndUpdate(decoded.id, { anilistToken: null });
    res.json({ message: 'AniList account unlinked', hasAnilistToken: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlink AniList' });
  }
});

// Delete User Account (Permanently deletes User and all related Watchlist data)
router.delete('/account', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'No authorization token' });

    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);

    // Delete user's watchlist records
    await Watchlist.deleteMany({ userId: decoded.id });

    // Delete user document
    await User.findByIdAndDelete(decoded.id);

    res.json({ message: 'Account and all associated data permanently deleted.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
