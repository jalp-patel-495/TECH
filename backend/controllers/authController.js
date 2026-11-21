const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, findUserById } = require('../models/userModel');
const { cache } = require('../config/redis');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'super_secret_live_auction_jwt_token_key_2026_secure',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'buyer' } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // Role validation
    const validRoles = ['admin', 'seller', 'buyer'];
    const assignedRole = validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'buyer';

    // Check if user already exists in PostgreSQL
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in instead.',
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Initial starting balance: 1000 for buyers, 0 for sellers
    const startingBalance = assignedRole === 'buyer' ? 2500.0 : 0.0;

    // Insert user into PostgreSQL
    const newUser = await createUser({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
      balance: startingBalance,
    });

    // Generate JWT token
    const token = generateToken(newUser);

    // Cache user session in Redis
    await cache.set(`session_${newUser.id}`, { id: newUser.id, role: newUser.role, email: newUser.email }, 604800);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        balance: newUser.balance,
        avatar_url: newUser.avatar_url,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    // Find user in PostgreSQL
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Store / update active session in Redis
    await cache.set(`session_${user.id}`, { id: user.id, role: user.role, email: user.email }, 604800);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful. Welcome back!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance: user.balance,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance: user.balance,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const token = req.token;
    if (token) {
      // Blacklist token in Redis until expiry (7 days = 604800s)
      await cache.blacklistToken(token, 604800);
    }
    if (req.user?.id) {
      await cache.del(`session_${req.user.id}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. Token invalidated in Redis.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
