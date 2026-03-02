// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Нет токена" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Неверный токен" });
  }
}

module.exports = authMiddleware;
