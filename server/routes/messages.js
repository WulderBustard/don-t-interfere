const express = require("express");
const db = require("../db"); // твой db.js с SQLite

const router = express.Router();

// Получить все сообщения по всем каналам
router.get("/", (req, res) => {
  try {
    const channels = db.getAllChannels(); // берем все каналы
    const result = {};
    channels.forEach(ch => {
      result[ch.id] = db.getMessages(ch.id); // получаем сообщения для каждого канала
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Добавить новое сообщение в канал
router.post("/:channelId", (req, res) => {
  const { channelId } = req.params;
  const { user, text, time } = req.body;

  if (!user || !text || !time) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const message = db.addMessage(channelId, user, text, time);
    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add message" });
  }
});

module.exports = router;
