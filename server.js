require("dotenv").config();

const express = require("express");
const mysql   = require("mysql2/promise");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

/*
|--------------------------------------------------------------------------
| DB Pool
|--------------------------------------------------------------------------
*/
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || "localhost",
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "user_auth_db",
  waitForConnections: true,
  connectionLimit:    10,
});

async function q(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/*
|--------------------------------------------------------------------------
| JWT Middleware
|--------------------------------------------------------------------------
*/
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET || "changeme");
    const [user]  = await q("SELECT id, name, email, role FROM users WHERE id = ? AND is_active = 1", [decoded.id]);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
app.get("/health", async (req, res) => {
  let dbStatus = "connected";
  try {
    await q("SELECT 1");
  } catch {
    dbStatus = "unreachable";
  }
  res.status(dbStatus === "connected" ? 200 : 503).json({
    status:    dbStatus === "connected" ? "UP" : "DEGRADED",
    message:   "Server is healthy",
    db:        dbStatus,
    timestamp: new Date(),
  });
});

/*
|--------------------------------------------------------------------------
| Auth — Register
|--------------------------------------------------------------------------
*/
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "name, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const [existing] = await q("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }

    const hash   = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const result = await pool.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, hash]
    );
    const insertId = result[0].insertId;

    const [user] = await q("SELECT id, name, email, role FROM users WHERE id = ?", [insertId]);
    const token  = jwt.sign({ id: user.id, email: user.email, role: user.role },
                              process.env.JWT_SECRET || "changeme",
                              { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

    res.status(201).json({ success: true, message: "User registered successfully", token, user });
  } catch (err) {
    console.error("[register]", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
|--------------------------------------------------------------------------
| Auth — Login
|--------------------------------------------------------------------------
*/
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    const [user] = await q("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role },
                             process.env.JWT_SECRET || "changeme",
                             { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

    const { password_hash, ...safeUser } = user;
    res.json({ success: true, message: "Login successful", token, user: safeUser });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
|--------------------------------------------------------------------------
| Auth — Me
|--------------------------------------------------------------------------
*/
app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

/*
|--------------------------------------------------------------------------
| Users API  (protected)
|--------------------------------------------------------------------------
*/
app.get("/api/users", authenticate, async (req, res) => {
  try {
    const users = await q("SELECT id, name, email, role, created_at FROM users WHERE is_active = 1 ORDER BY created_at DESC");
    res.json({ success: true, data: users });
  } catch (err) {
    console.error("[users]", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/users/profile", authenticate, async (req, res) => {
  try {
    const [user] = await q("SELECT id, name, email, role, created_at FROM users WHERE id = ?", [req.user.id]);
    res.json({ success: true, user });
  } catch (err) {
    console.error("[profile]", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.put("/api/users/profile", authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (email) {
      const [taken] = await q("SELECT id FROM users WHERE email = ? AND id != ?", [email, req.user.id]);
      if (taken) return res.status(409).json({ success: false, message: "Email already in use" });
    }
    await pool.execute(
      "UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?",
      [name || null, email || null, req.user.id]
    );
    const [updated] = await q("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id]);
    res.json({ success: true, message: "Profile updated", user: updated });
  } catch (err) {
    console.error("[updateProfile]", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.put("/api/users/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
    }
    const [user]  = await q("SELECT * FROM users WHERE id = ?", [req.user.id]);
    const match   = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ success: false, message: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.user.id]);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("[changePassword]", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/*
|--------------------------------------------------------------------------
| Mock Products API  (unchanged — no DB table needed)
|--------------------------------------------------------------------------
*/
app.get("/api/products", (req, res) => {
  res.json([
    { id: 101, name: "Laptop", price: 55000 },
    { id: 102, name: "Phone",  price: 25000 },
  ]);
});

/*
|--------------------------------------------------------------------------
| Root Route
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.send(`
    <h1>Mock Express API Running 🚀</h1>
    <p>Available Endpoints:</p>
    <ul>
      <li>GET  /health</li>
      <li>POST /api/auth/register</li>
      <li>POST /api/auth/login</li>
      <li>GET  /api/auth/me        — 🔒 Bearer</li>
      <li>GET  /api/users          — 🔒 Bearer</li>
      <li>GET  /api/users/profile  — 🔒 Bearer</li>
      <li>PUT  /api/users/profile  — 🔒 Bearer</li>
      <li>PUT  /api/users/change-password — 🔒 Bearer</li>
      <li>GET  /api/products</li>
    </ul>
  `);
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
