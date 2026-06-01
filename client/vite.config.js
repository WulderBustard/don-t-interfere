import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import os from "os";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const HOST = getLanHost();
const keyPath = resolveCertificatePath(process.env.SSL_KEY_PATH, "key.pem");
const certPath = resolveCertificatePath(process.env.SSL_CERT_PATH, "cert.pem");

export default defineConfig({
  plugins: [react()],
  server: {
    host: HOST,
    port: 3000,
    strictPort: true,
    https: {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    allowedHosts: [HOST],
  },
});
