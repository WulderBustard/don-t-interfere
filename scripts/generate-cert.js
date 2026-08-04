const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const serverKey = path.join(root, "server", "key.pem");
const serverCert = path.join(root, "server", "cert.pem");
const clientKey = path.join(root, "client", "key.pem");
const clientCert = path.join(root, "client", "cert.pem");
const files = [serverKey, serverCert, clientKey, clientCert];

if (files.every((file) => fs.existsSync(file))) {
  console.log("Development certificates already exist.");
  process.exit(0);
}

function getLanHost() {
  if (process.env.HOST) return process.env.HOST;

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }

  return "127.0.0.1";
}

const host = getLanHost();
const hostSan = net.isIP(host) ? `IP:${host}` : `DNS:${host}`;
const result = spawnSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-sha256",
    "-days",
    "825",
    "-nodes",
    "-keyout",
    serverKey,
    "-out",
    serverCert,
    "-subj",
    `/CN=${host}`,
    "-addext",
    `subjectAltName=${hostSan},IP:127.0.0.1,DNS:localhost`,
  ],
  { stdio: "inherit" }
);

if (result.error) {
  console.error("OpenSSL is required to generate development certificates.");
  throw result.error;
}
if (result.status !== 0) process.exit(result.status || 1);

fs.copyFileSync(serverKey, clientKey);
fs.copyFileSync(serverCert, clientCert);

if (process.platform !== "win32") {
  fs.chmodSync(serverKey, 0o600);
  fs.chmodSync(clientKey, 0o600);
}

console.log(`Development certificate created for ${host}.`);
