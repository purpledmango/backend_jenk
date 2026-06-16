# user-auth-api

Node.js + Express + MySQL REST API for user registration, authentication, and profile management.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and a strong JWT_SECRET
```

### 3. Create the database
```bash
mysql -u root -p < sql/schema.sql
```

### 4. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login, receive JWT |
| GET | `/api/auth/me` | Bearer | Current user info |

### User (self-service)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/profile` | Bearer | Get own profile |
| PUT | `/api/users/profile` | Bearer | Update name / email |
| PUT | `/api/users/change-password` | Bearer | Change password |
| DELETE | `/api/users/profile` | Bearer | Deactivate own account |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Bearer (admin) | List all users (paginated) |
| GET | `/api/users/:id` | Bearer (admin) | Get user by ID |
| PATCH | `/api/users/:id/role` | Bearer (admin) | Change user role |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | DB + uptime check |

---

## Example Requests

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Nitish","email":"nitish@example.com","password":"Secret123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nitish@example.com","password":"Secret123"}'
```

### Access protected route
```bash
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <your_token>"
```

---

## Project Structure

```
user-auth-api/
├── sql/
│   └── schema.sql          # Database schema
├── src/
│   ├── config/
│   │   └── db.js           # MySQL pool + query helpers
│   ├── controllers/
│   │   ├── authController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js         # JWT authenticate + authorize
│   │   └── validate.js     # express-validator runner
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── health.js
│   └── index.js            # Express app entry point
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Security Notes

- Passwords are hashed with **bcrypt** (configurable rounds via `BCRYPT_ROUNDS`).
- JWTs are signed with `JWT_SECRET` — use a long random string in production.
- Deleted accounts are **soft-deleted** (deactivated), not removed from the database.
- Admin endpoints are protected by role-based authorization.
