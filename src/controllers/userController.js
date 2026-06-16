const bcrypt = require('bcryptjs');
const db     = require('../config/db');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

function safeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

/**
 * GET /api/users/profile
 */
async function getProfile(req, res) {
  try {
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error('[getProfile]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * PUT /api/users/profile
 */
async function updateProfile(req, res) {
  try {
    const { name, email } = req.body;

    // Check if new email is taken by another user
    if (email) {
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.user.id]
      );
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
    }

    await db.execute(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
      [name || null, email || null, req.user.id]
    );

    const [updated] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ success: true, message: 'Profile updated', user: safeUser(updated) });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * PUT /api/users/change-password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const password_hash = await bcrypt.hash(newPassword, ROUNDS);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.id]);

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('[changePassword]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * DELETE /api/users/profile  — soft-delete (deactivate)
 */
async function deleteAccount(req, res) {
  try {
    await db.execute('UPDATE users SET is_active = 0 WHERE id = ?', [req.user.id]);
    return res.json({ success: true, message: 'Account deactivated' });
  } catch (err) {
    console.error('[deleteAccount]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/users  (admin only)
 */
async function listUsers(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const users = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [{ total }] = await db.query('SELECT COUNT(*) AS total FROM users');

    return res.json({
      success: true,
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[listUsers]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * GET /api/users/:id  (admin only)
 */
async function getUserById(req, res) {
  try {
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error('[getUserById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * PATCH /api/users/:id/role  (admin only)
 */
async function updateUserRole(req, res) {
  try {
    const { role } = req.body;
    await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    return res.json({ success: true, message: `Role updated to ${role}` });
  } catch (err) {
    console.error('[updateUserRole]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  listUsers,
  getUserById,
  updateUserRole,
};
