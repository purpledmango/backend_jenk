const express    = require('express');
const { body }   = require('express-validator');
const controller = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate   = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/\d/).withMessage('Password must contain a number'),
  ],
  validate,
  controller.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  controller.login
);

// GET /api/auth/me
router.get('/me', authenticate, controller.me);

module.exports = router;
