const express = require('express');
const bcrypt = require('bcrypt');
const { authenticateToken } = require('../middleware/auth');
const { generateAccessToken, generateRefreshToken, hashToken, getRefreshTokenExpiry } = require('../services/tokenService');
const router = express.Router();

const SALT_ROUNDS = 10;

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await req.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await req.prisma.user.create({
      data: {
        email,
        passwordHash
      }
    });

    // Generate tokens
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    await req.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: getRefreshTokenExpiry()
      }
    });

    res.status(201).json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    req.log.error({ err: error }, 'Registration failed');
    res.status(500).json({ message: 'Failed to create account' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate tokens
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    await req.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: getRefreshTokenExpiry()
      }
    });

    res.json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    req.log.error({ err: error }, 'Login failed');
    res.status(500).json({ message: 'Login failed' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await req.prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash }
    });

    res.json({ message: 'Password updated' });
  } catch (error) {
    req.log.error({ err: error }, 'Password change failed');
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const tokenHash = hashToken(refreshToken);

    const stored = await req.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!stored) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    if (stored.expiresAt < new Date()) {
      await req.prisma.refreshToken.delete({ where: { id: stored.id } });
      return res.status(403).json({ message: 'Refresh token expired' });
    }

    // Rotate: delete old token, create new one
    const newRefreshToken = generateRefreshToken();

    await req.prisma.$transaction([
      req.prisma.refreshToken.delete({ where: { id: stored.id } }),
      req.prisma.refreshToken.create({
        data: {
          tokenHash: hashToken(newRefreshToken),
          userId: stored.userId,
          expiresAt: getRefreshTokenExpiry()
        }
      }),
      // Clean up any expired tokens for this user
      req.prisma.refreshToken.deleteMany({
        where: { userId: stored.userId, expiresAt: { lt: new Date() } }
      })
    ]);

    const token = generateAccessToken(stored.user);

    res.json({
      token,
      refreshToken: newRefreshToken,
      user: { id: stored.user.id, email: stored.user.email }
    });
  } catch (error) {
    req.log.error({ err: error }, 'Token refresh failed');
    res.status(500).json({ message: 'Failed to refresh token' });
  }
});

// Logout (invalidate refresh token)
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await req.prisma.refreshToken.deleteMany({
        where: { tokenHash }
      });
    }

    res.json({ message: 'Logged out' });
  } catch (error) {
    req.log.error({ err: error }, 'Logout failed');
    res.status(500).json({ message: 'Logout failed' });
  }
});

module.exports = router;
