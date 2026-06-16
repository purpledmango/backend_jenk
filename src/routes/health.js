const express = require('express');
const db      = require('../config/db');

const router = express.Router();

// GET /health
router.get('/', async (req, res) => {
  const dbOk = await db.ping();
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    status: dbOk ? 'ok' : 'degraded',
    db:     dbOk ? 'connected' : 'unreachable',
    uptime: process.uptime(),
    time:   new Date().toISOString(),
  });
});

module.exports = router;
