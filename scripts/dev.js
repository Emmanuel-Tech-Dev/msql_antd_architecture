// npm run dev at the repository root: the API (server/) and the example UI together.
// Each line is labelled with its source; when one stops, the other is stopped too.
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const apps = [
  { label: "api", color: 36, args: ["run", "dev", "-w", "server"] },
  { label: "ui ", color: 35, args: ["run", "dev", "-w", "ui"] },
];

const running = apps.map(({ label, color, args }) => {
  const child = spawn("npm", args, { cwd: root, shell: true, env: { ...process.env, FORCE_COLOR: "1" } });
  const prefix = `\x1b[${color}m[${label}]\x1b[0m `;
  for (const stream of [child.stdout, child.stderr]) {
    let pending = "";
    stream.on("data", (chunk) => {
      const lines = (pending + chunk).split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) process.stdout.write(prefix + line + "\n");
    });
  }
  child.on("exit", (code) => {
    process.stdout.write(`${prefix}stopped (exit ${code ?? "signal"})\n`);
    stopAll();
  });
  return child;
});

let stopping = false;
function stopAll() {
  if (stopping) return;
  stopping = true;
  for (const child of running) {
    if (child.exitCode !== null) continue;
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
  process.exitCode = 0;
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
