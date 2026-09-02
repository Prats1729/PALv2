const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/crypto');
const { importAniListWatchlist } = require('../utils/anilistImporter');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const User = mongoose.model('User');
const Watchlist = mongoose.model('Watchlist');
const JWT_SECRET = process.env.JWT_SECRET;

function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

// 0. Verify Session / Current User
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        hasAnilistToken: !!user.anilistToken
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
});

// Update Profile Picture / Avatar
router.put('/avatar', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (avatar && typeof avatar === 'string' && avatar.length > 2.5 * 1024 * 1024) {
      return res.status(400).json({ error: "Avatar image is too large. Max size is 2MB." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatar || null },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile picture updated successfully!",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        hasAnilistToken: !!updatedUser.anilistToken
      }
    });
  } catch (err) {
    console.error("Update avatar error:", err);
    res.status(500).json({ error: "Failed to update profile picture" });
  }
});

// Change Username
router.put('/change-username', authMiddleware, async (req, res) => {
  try {
    const { newUsername } = req.body;
    const cleanUsername = (newUsername || '').trim();

    if (!cleanUsername) {
      return res.status(400).json({ error: "Username cannot be empty" });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters long" });
    }

    if (cleanUsername.length > 30) {
      return res.status(400).json({ error: "Username cannot exceed 30 characters" });
    }

    if (!/^[a-zA-Z0-9_\-\.]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, dots, hyphens, and underscores" });
    }

    // Check if username is already taken by another account
    const existing = await User.findOne({ 
      username: cleanUsername, 
      _id: { $ne: req.user.id } 
    }).collation({ locale: 'en', strength: 2 });

    if (existing) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { username: cleanUsername },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: "User account not found" });
    }

    res.json({
      message: "Username updated successfully!",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        hasAnilistToken: !!updatedUser.anilistToken
      }
    });
  } catch (err) {
    console.error("Change username error:", err);
    res.status(500).json({ error: "Failed to update username" });
  }
});

// Change Password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const pwError = validatePassword(newPassword);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User account not found" });
    }

    // If user already has a password, verify current password
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect current password" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to update password" });
  }
});

// 1. Register Route (with Email and Password Confirmation)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    // Validate email format if provided
    const cleanEmail = email && email.trim().length > 0 ? email.trim().toLowerCase() : undefined;
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

    const userData = {
      username: username.trim(),
      password: hashedPassword
    };
    if (cleanEmail) {
      userData.email = cleanEmail;
    }

    const newUser = new User(userData);

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { 
      expiresIn: '7d',
      issuer: 'palv2-api',
      audience: 'palv2-client'
    });
    
    res.status(201).json({ 
      token, 
      user: { 
        id: newUser._id, 
        username: newUser.username, 
        email: newUser.email,
        avatar: newUser.avatar || null,
        hasAnilistToken: false 
      } 
    });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === 11000) {
      if (err.keyPattern?.email || (err.message && err.message.includes('email'))) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
      if (err.keyPattern?.username || (err.message && err.message.includes('username'))) {
        return res.status(400).json({ error: "Username is already taken" });
      }
      return res.status(400).json({ error: "An account with these details already exists" });
    }
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

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { 
      expiresIn: '7d',
      issuer: 'palv2-api',
      audience: 'palv2-client'
    });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        avatar: user.avatar || null,
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
      if (!user.avatar && viewer.avatar?.large) {
        user.avatar = viewer.avatar.large;
      }
      await user.save();
    } else {
      // Auto-create new PALv2 user from AniList profile
      user = new User({
        username: viewer.name,
        anilistId: viewer.id,
        anilistToken: encryptedToken,
        avatar: viewer.avatar?.large || null
      });
      await user.save();
    }

    // Auto-sync entire AniList watchlist in MongoDB for this user
    try {
      await importAniListWatchlist(user._id, anilistToken, Watchlist);
    } catch (syncErr) {
      console.warn("Initial AniList watchlist sync note:", syncErr.message);
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { 
      expiresIn: '7d',
      issuer: 'palv2-api',
      audience: 'palv2-client'
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        hasAnilistToken: true,
        avatar: user.avatar || viewer.avatar?.large || null
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
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 Password Reset Token for ${user.username} (${user.email}): ${resetToken}`);
    }

    res.json({
      message: "If an account exists with this email, password reset instructions have been generated."
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

    const pwError = validatePassword(newPassword);
    if (pwError) {
      return res.status(400).json({ error: pwError });
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
router.post('/link-anilist', authMiddleware, async (req, res) => {
  try {
    const { anilistToken } = req.body;
    if (!anilistToken) return res.status(400).json({ error: 'No AniList token provided' });

    const encryptedToken = encrypt(anilistToken);
    await User.findByIdAndUpdate(req.user.id, { anilistToken: encryptedToken });

    res.json({ message: 'AniList account linked successfully!', hasAnilistToken: true });
  } catch (err) {
    console.error('Link AniList error:', err);
    res.status(500).json({ error: 'Failed to link AniList account' });
  }
});

// Get decrypted AniList token (for frontend sync calls)
router.get('/anilist-token', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
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
router.delete('/unlink-anilist', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { anilistToken: null });
    res.json({ message: 'AniList account unlinked', hasAnilistToken: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlink AniList' });
  }
});

// Delete User Account (Permanently deletes User and all related Watchlist data)
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    // Delete user's watchlist records
    await Watchlist.deleteMany({ userId: req.user.id });

    // Delete user document
    await User.findByIdAndDelete(req.user.id);

    res.json({ message: 'Account and all associated data permanently deleted.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
