const express    = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const validate   = require('../middleware/validate');

const router = express.Router();

// All routes below require a valid JWT
router.use(authenticate);

// ── Self-service ──────────────────────────────────────────────────────────────

// GET  /api/users/profile
router.get('/profile', controller.getProfile);

// PUT  /api/users/profile
router.put(
  '/profile',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail(),
  ],
  validate,
  controller.updateProfile
);

// PUT  /api/users/change-password
router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/\d/).withMessage('Password must contain a number'),
  ],
  validate,
  controller.changePassword
);

// DELETE /api/users/profile
router.delete('/profile', controller.deleteAccount);

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET  /api/users
router.get('/', authorize('admin'), controller.listUsers);

// GET  /api/users/:id
router.get(
  '/:id',
  authorize('admin'),
  [param('id').isInt({ min: 1 })],
  validate,
  controller.getUserById
);

// PATCH /api/users/:id/role
router.patch(
  '/:id/role',
  authorize('admin'),
  [
    param('id').isInt({ min: 1 }),
    body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  ],
  validate,
  controller.updateUserRole
);

module.exports = router;
