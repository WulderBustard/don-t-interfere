const express = require("express");
const cors = require("cors");
const fs = require("fs");
const https = require("https");
const { Server } = require("socket.io");

const channelsRouter = require("./routes/channels");
const createMessagesRouter = require("./routes/messages");
const voiceModule = require("./routes/voice");
const authRouter = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/channels", authMiddleware, channelsRouter);
app.get("/", (req, res) => res.send("OK"));

const options = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
};

const server = https.createServer(options, app);

const io = new Server(server, {
  cors: { origin: "*" },
});

voiceModule(io);

// messages router теперь получает io
app.use("/messages", authMiddleware, createMessagesRouter(io));

server.listen(PORT, () => {
  console.log(`HTTPS сервер запущен на https://localhost:${PORT}`);
});
