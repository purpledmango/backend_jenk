const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:               process.env.DB_HOST     || 'localhost',
      port:               parseInt(process.env.DB_PORT) || 3306,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      database:           process.env.DB_NAME     || 'user_auth_db',
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
      connectTimeout:     10000,
    });
    console.log('[DB] Connection pool created');
  }
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function execute(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function ping() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Pool closed');
  }
}

process.on('SIGINT',  () => closePool().then(() => process.exit(0)));
process.on('SIGTERM', () => closePool().then(() => process.exit(0)));

module.exports = { getPool, query, execute, withTransaction, ping, closePool };
