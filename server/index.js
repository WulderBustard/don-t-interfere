const express = require("express");
const cors = require("cors");
const fs = require("fs");
const https = require("https");
const { Server } = require("socket.io");

// Роутеры API
const channelsRouter = require("./routes/channels");
const messagesRouter = require("./routes/messages");
const voiceModule = require("./routes/voice");
const authRouter = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API роуты
app.use("/auth", authRouter);
app.use("/channels", authMiddleware, channelsRouter);
app.use("/messages", authMiddleware, messagesRouter);
app.get("/", (req, res) => res.send("OK"));

// Чтение сертификатов
const options = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem")
};

// HTTPS-сервер
const server = https.createServer(options, app);

// Socket.IO
const io = new Server(server, {
  cors: { origin: "*" }
});

// Подключаем голосовой модуль
voiceModule(io);

// Запуск
server.listen(PORT, () => {
  console.log(`HTTPS сервер запущен на https://10.21.3.106:${PORT}`);
});
