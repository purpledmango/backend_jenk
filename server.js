const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    message: "Server is healthy",
    timestamp: new Date(),
  });
});

/*
|--------------------------------------------------------------------------
| Mock Users API
|--------------------------------------------------------------------------
*/
app.get("/api/users", (req, res) => {
  res.json([
    {
      id: 1,
      name: "Nitish",
      email: "nitish@example.com",
    },
    {
      id: 2,
      name: "Rahul",
      email: "rahul@example.com",
    },
  ]);
});

/*
|--------------------------------------------------------------------------
| Mock Products API
|--------------------------------------------------------------------------
*/
app.get("/api/products", (req, res) => {
  res.json([
    {
      id: 101,
      name: "Laptop",
      price: 55000,
    },
    {
      id: 102,
      name: "Phone",
      price: 25000,
    },
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
      <li>/health</li>
      <li>/api/users</li>
      <li>/api/products</li>
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

