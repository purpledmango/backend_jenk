const { validationResult } = require('express-validator');

/**
 * Runs after express-validator chains; returns 422 on any failure.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

module.exports = validate;
