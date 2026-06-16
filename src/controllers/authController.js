const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function safeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Check duplicate email
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, ROUNDS);

    const result = await db.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, password_hash]
    );

    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * GET /api/auth/me  — requires authenticate middleware
 */
async function me(req, res) {
  try {
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { register, login, me };
