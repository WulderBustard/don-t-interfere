const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const db = require("../db");

const AVATAR_DIR = path.join(__dirname, "..", "uploads", "avatars");
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

fs.mkdirSync(AVATAR_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Разрешены только JPG, PNG и WEBP изображения"));
    }
    cb(null, true);
  },
});

function publicUser(user) {
  if (!user) return null;
  return {
    ...user,
    mic_muted: Boolean(user.mic_muted),
    is_admin: Boolean(user.is_admin),
  };
}

function emitUser(io, user) {
  if (io && user) io.emit("user:updated", publicUser(user));
}

function removeOldAvatar(username) {
  const avatarUrl = db.getAvatarPath(username);
  if (!avatarUrl) return;

  const filename = path.basename(avatarUrl);
  const fullPath = path.join(AVATAR_DIR, filename);
  if (fullPath.startsWith(AVATAR_DIR) && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

module.exports = function createUsersRouter(io) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      res.json(db.getAllUsers().map(publicUser));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  router.get("/me", (req, res) => {
    const user = db.getPublicUser(req.user.username);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(publicUser(user));
  });

  router.patch("/me/presence", (req, res) => {
    const user = db.updateUserPresence(req.user.username, {
      status: req.body.status,
      micMuted: req.body.micMuted,
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    emitUser(io, user);
    res.json(publicUser(user));
  });

  router.post("/me/avatar", upload.single("avatar"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Файл аватара не передан" });

    try {
      removeOldAvatar(req.user.username);

      const safeUsername = req.user.username.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeUsername}-${Date.now()}.webp`;
      const outputPath = path.join(AVATAR_DIR, filename);

      await sharp(req.file.buffer)
        .rotate()
        .resize(128, 128, { fit: "cover" })
        .webp({ quality: 82 })
        .toFile(outputPath);

      const avatarUrl = `/uploads/avatars/${filename}`;
      const user = db.updateUserAvatar(req.user.username, avatarUrl);

      emitUser(io, user);
      res.json(publicUser(user));
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Не удалось обработать изображение" });
    }
  });

  router.delete("/:username", (req, res) => {
    const admin = db.getPublicUser(req.user.username);
    if (!admin?.is_admin) return res.status(403).json({ error: "Только администратор может удалять пользователей" });

    const username = req.params.username;
    if (username === req.user.username) return res.status(400).json({ error: "Нельзя удалить текущего администратора" });

    const user = db.getPublicUser(username);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    if (user.is_admin) return res.status(400).json({ error: "Нельзя удалить администратора" });

    removeOldAvatar(username);
    const deleted = db.deleteUser(username);
    if (!deleted) return res.status(404).json({ error: "Пользователь не найден" });

    if (io) io.emit("user:deleted", { username });
    res.json({ ok: true, user: publicUser(deleted) });
  });

  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Файл аватара не должен превышать 2 МБ" });
    }
    if (err) return res.status(400).json({ error: err.message || "Ошибка загрузки файла" });
    next();
  });

  return router;
};
