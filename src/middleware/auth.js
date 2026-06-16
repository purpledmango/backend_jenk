const jwt = require('jsonwebtoken');
const db  = require('../config/db');

/**
 * Verifies the Bearer JWT and attaches the decoded user to req.user.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm user still exists and is active
    const [user] = await db.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/**
 * Role-based guard — use after authenticate().
 * @param  {...string} roles  Allowed roles, e.g. 'admin'
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
