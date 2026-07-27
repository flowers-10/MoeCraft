import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const environment = { ...process.env };

if (!isWindows && !environment.TMPDIR) {
  environment.TMPDIR = "/tmp";
}

const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "nuxt";
const args = isWindows
  ? ["/d", "/s", "/c", "nuxt.cmd dev --port 3100"]
  : ["dev", "--port", "3100"];

const child = spawn(command, args, {
  env: environment,
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error(`Failed to start Nuxt: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
