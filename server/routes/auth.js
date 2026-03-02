const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// === Регистрация ===
router.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Введите логин и пароль" });

  const existing = db.getUser(username);
  if (existing) return res.status(400).json({ error: "Пользователь уже существует" });

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = db.createUser(username, passwordHash);

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ user: newUser, token });
});

// === Авторизация ===
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Введите логин и пароль" });

  const user = db.getUser(username);
  if (!user) return res.status(400).json({ error: "Пользователь не найден" });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: "Неверный пароль" });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ user: { id: user.id, username: user.username }, token });
});

module.exports = router;
