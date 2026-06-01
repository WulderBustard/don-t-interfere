const express = require("express");
const router = express.Router();
const db = require("../db");

function isMainChannel(channel) {
  return channel?.name?.trim().toLowerCase() === "main";
}

function canDeleteChannel(channel, user) {
  if (!channel || !user) return false;
  if (user.is_admin) return true;
  if (isMainChannel(channel)) return false;
  return channel.owner_username === user.username;
}

router.get("/", (req, res) => {
  res.json(db.getAllChannels());
});

router.post("/", (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: "name+type required" });

  try {
    const ch = db.createChannel(name.trim(), type, req.user.username);
    res.status(201).json(ch);
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Channel exists" });
    }

    console.error(err);
    res.status(500).json({ error: "db error" });
  }
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "invalid id" });

  const channel = db.getChannel(id);
  if (!channel) return res.status(404).json({ error: "Такого канала не существует" });

  const user = db.getPublicUser(req.user.username);
  if (!canDeleteChannel(channel, user)) {
    return res.status(403).json({ error: "Нет прав на удаление канала" });
  }

  const ok = db.deleteChannel(id);
  if (ok) return res.json({ success: true });

  return res.status(404).json({ error: "Такого канала не существует" });
});

module.exports = router;
