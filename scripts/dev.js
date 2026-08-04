const { spawn } = require("node:child_process");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const processes = [
  spawn(npm, ["start", "--prefix", "server"], { stdio: "inherit" }),
  spawn(npm, ["run", "dev", "--prefix", "client"], { stdio: "inherit" }),
];

let stopping = false;
let exitCode = 0;

function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;

  for (const child of processes) {
    if (!child.killed) child.kill(signal);
  }

  setTimeout(() => process.exit(exitCode), 1000).unref();
}

for (const child of processes) {
  child.on("error", (error) => {
    console.error(error);
    exitCode = 1;
    stop();
  });

  child.on("exit", (code, signal) => {
    if (stopping) return;
    exitCode = code ?? (signal ? 1 : 0);
    stop();
  });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
