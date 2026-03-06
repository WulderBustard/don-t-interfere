const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  try {
    const users = db.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

module.exports = router;
