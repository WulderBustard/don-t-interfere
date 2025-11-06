// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "supersecret";

// Регистрация
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = db.createUser(username.trim(), hashed);
    res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "User exists" });
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// Вход
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = db.getUserByUsername(username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: "1h" });
  res.json({ token, username: user.username });
});

module.exports = router;
