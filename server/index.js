const express = require("express");
const cors = require("cors");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const { Server } = require("socket.io");

const channelsRouter = require("./routes/channels");
const createMessagesRouter = require("./routes/messages");
const createUsersRouter = require("./routes/users");
const voiceModule = require("./routes/voice");
const authRouter = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");

require("dotenv").config();

function getLanHost() {
  if (process.env.HOST) return process.env.HOST;

  const interfaces = os.networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return "127.0.0.1";
}

function resolveCertificatePath(value, fallback) {
  return path.resolve(__dirname, value || fallback);
}

function loadHttpsOptions() {
  const keyPath = resolveCertificatePath(process.env.SSL_KEY_PATH, "key.pem");
  const certPath = resolveCertificatePath(process.env.SSL_CERT_PATH, "cert.pem");

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = getLanHost();
const ALLOWED_HOSTS = new Set([HOST, `${HOST}:${PORT}`]);

app.use((req, res, next) => {
  const requestHost = String(req.headers.host || "").toLowerCase();
  if (!ALLOWED_HOSTS.has(requestHost)) {
    return res.status(403).send(`Use https://${HOST}:${PORT}`);
  }
  return next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/auth", authRouter);
app.use("/channels", authMiddleware, channelsRouter);
app.get("/", (req, res) => res.send("OK"));

const server = https.createServer(loadHttpsOptions(), app);

const io = new Server(server, {
  cors: { origin: "*" },
  allowRequest: (req, callback) => {
    const requestHost = String(req.headers.host || "").toLowerCase();
    callback(null, ALLOWED_HOSTS.has(requestHost));
  },
});

voiceModule(io);
app.use("/users", authMiddleware, createUsersRouter(io));
app.use("/messages", authMiddleware, createMessagesRouter(io));

server.listen(PORT, HOST, () => {
  console.log(`HTTPS сервер запущен на https://${HOST}:${PORT}`);
});
