import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

// Tests only this local production build. No real database or provider credentials.
async function unusedPort() {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const { port } = reservation.address();
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function withServer(password, run) {
  const port = await unusedPort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: "postgresql://smoke:smoke@127.0.0.1:1/zgjoi_smoke",
      DIRECT_URL: "postgresql://smoke:smoke@127.0.0.1:1/zgjoi_smoke",
      ZGJOI_PASSWORD: password,
      CRON_SECRET: randomBytes(16).toString("hex"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  let startError;
  child.on("error", (error) => { startError = error; });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => { logs = (logs + chunk.toString()).slice(-20_000); });
  }
  const request = (path, options = {}) => fetch(base + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    ...options,
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (startError) throw startError;
      if (child.exitCode !== null) throw new Error(`Next.js exited with ${child.exitCode}`);
      try {
        const response = await request("/se-shpejti");
        await response.arrayBuffer();
        if (response.status === 200) { ready = true; break; }
      } catch { /* The local server may still be starting. */ }
      await delay(200);
    }
    assert.ok(ready, "Local production server must start");
    await run(request);
  } catch (error) {
    console.error(logs);
    throw error;
  } finally {
    if (child.exitCode === null && !child.killed) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
      await exited;
      clearTimeout(force);
    }
  }
}

let checks = 0;
async function check(label, fn) {
  await fn();
  checks++;
  console.log(`PASS ${label}`);
}

await withServer("", async (request) => {
  for (const path of ["/", "/kerko?q=elektricist", "/kategorite", "/profesionisti/arben-elektricist", "/se-shpejti"]) {
    await check(`HTML ${path}`, async () => {
      const res = await request(path);
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type"), /text\/html/);
      assert.match(await res.text(), /Zgjoi/);
    });
  }
  await check("async profile parameters and metadata", async () => {
    const res = await request("/profesionisti/arben-elektricist");
    assert.match(await res.text(), /<title>Arben/);
  });
  await check("unknown professional returns 404", async () => {
    assert.equal((await request("/profesionisti/smoke-missing-professional")).status, 404);
  });
  await check("anonymous session lookup", async () => {
    const res = await request("/api/auth/me");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { user: null });
  });
  for (const path of ["/llogaria", "/pro/pagesat", "/admin/perdoruesit?q=smoke"]) {
    await check(`anonymous redirect ${path}`, async () => {
      const res = await request(path);
      assert.equal(res.status, 307);
      const destination = new URL(res.headers.get("location"), "http://localhost");
      assert.equal(destination.pathname, "/hyr");
      assert.equal(destination.searchParams.get("next"), path.split("?")[0]);
    });
  }
  for (const method of ["GET", "POST"]) {
    await check(`anonymous messages ${method} denied`, async () => {
      const res = await request("/api/messages", { method });
      assert.equal(res.status, 401);
      assert.equal((await res.json()).error, "UNAUTHENTICATED");
    });
  }
  await check("anonymous support administration denied", async () => {
    assert.equal((await request("/api/support/tickets")).status, 403);
  });
});

const previewPassword = randomBytes(16).toString("hex");
await withServer(previewPassword, async (request) => {
  await check("site lock survives proxy migration", async () => {
    const res = await request("/kerko");
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Së shpejti/);
  });
  await check("incorrect site password is rejected", async () => {
    const res = await request("/api/hyrje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fjalekalimi: "incorrect-smoke-password" }),
    });
    assert.equal(res.status, 401);
  });
  let previewCookie;
  await check("correct site password sets preview cookie", async () => {
    const res = await request("/api/hyrje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fjalekalimi: previewPassword }),
    });
    assert.equal(res.status, 200);
    previewCookie = res.headers.get("set-cookie");
    assert.match(previewCookie, /zgjoi_preview=/);
    assert.match(previewCookie, /httponly/i);
    assert.match(previewCookie, /secure/i);
  });
  await check("preview cookie unlocks public routes", async () => {
    const res = await request("/kategorite", { headers: { cookie: previewCookie.split(";")[0] } });
    assert.equal(res.status, 200);
    assert.doesNotMatch(await res.text(), /<h1[^>]*>\s*Së shpejti/);
  });
});

console.log(`${checks} production-build HTTP smoke checks passed. Database-backed and browser journeys remain separate gates.`);
