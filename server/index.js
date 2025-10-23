const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Роутеры API
const channelsRouter = require("./routes/channels");
const messagesRouter = require("./routes/messages");
const voiceModule = require("./routes/voice"); // Socket.IO модуль

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API роуты
app.use("/channels", channelsRouter);
app.use("/messages", messagesRouter);
app.get("/", (req, res) => res.send("OK"));

// Создаем HTTP-сервер для Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // если фронтенд на другом домене
});

// Подключаем голосовой модуль
voiceModule(io);

server.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
