import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
const url = new URL(process.env.DATABASE_URL || "");
if (
  !process.env.CI ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.pathname !== "/zgjoi_test"
)
  throw new Error("Integration tests require the disposable CI database");
const env = {
  ...process.env,
  CHECKPOINT_DISABLE: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  APP_URL: "https://staging.zgjoi.invalid",
  TEST_BASE_URL: "http://localhost:3100",
  ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  ZGJOI_PASSWORD: "",
  CRON_SECRET: randomBytes(32).toString("hex"),
  PAYMENTS_MODE: "disabled",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
  EMAIL_DELIVERY_ENABLED: "false",
  DOCUMENT_UPLOADS_ENABLED: "false",
};
const app = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3100", "-H", "127.0.0.1"],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
for (const stream of [app.stdout, app.stderr])
  stream.on("data", (chunk) => {
    logs = (logs + chunk).slice(-16000);
  });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`${env.TEST_BASE_URL}/api/auth/me`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!ready) throw new Error("Application did not start");
  const child = spawn(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "--test",
      "--test-concurrency=1",
      "tests/integration.test.ts",
    ],
    { env, stdio: "inherit" },
  );
  const code = await new Promise((resolve) => child.on("exit", resolve));
  process.exitCode = typeof code === "number" ? code : 1;
  if (process.exitCode) console.error(logs);
} finally {
  app.kill("SIGTERM");
}
