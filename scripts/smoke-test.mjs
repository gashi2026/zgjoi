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
  await new Promise((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function withServer(password, run) {
  const port = await unusedPort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
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
    },
  );
  let logs = "";
  let startError;
  child.on("error", (error) => {
    startError = error;
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      logs = (logs + chunk.toString()).slice(-20_000);
    });
  }
  const request = (path, options = {}) =>
    fetch(base + path, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      ...options,
    });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (startError) throw startError;
      if (child.exitCode !== null)
        throw new Error(`Next.js exited with ${child.exitCode}`);
      try {
        const response = await request("/se-shpejti");
        await response.arrayBuffer();
        if (response.status === 200) {
          ready = true;
          break;
        }
      } catch {
        /* The local server may still be starting. */
      }
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
  for (const path of [
    "/hyr",
    "/regjistrohu",
    "/se-shpejti",
    "/si-funksionon",
    "/rreth-nesh",
    "/kushtet",
    "/privatesia",
  ]) {
    await check(`Public HTML ${path}`, async () => {
      const response = await request(path);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Zgjoi/);
    });
  }
  await check("anonymous session lookup needs no database", async () => {
    const response = await request("/api/auth/me");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { user: null });
  });
  for (const path of [
    "/llogaria",
    "/pro/pagesat",
    "/admin/perdoruesit",
    "/kerkesa-e-re",
  ])
    await check(`Anonymous private redirect ${path}`, async () => {
      const response = await request(path);
      assert.equal(response.status, 307);
      assert.match(response.headers.get("location"), /\/hyr/);
    });
  await check("anonymous job messages are denied", async () => {
    assert.equal(
      (await request("/api/messages?conversationId=missing")).status,
      401,
    );
  });
  await check("worker fails closed with no bearer token", async () => {
    assert.equal((await request("/api/cron/escrow")).status, 403);
  });
  await check("webhook fails closed with no signature", async () => {
    assert.equal(
      (await request("/api/stripe/webhook", { method: "POST", body: "{}" }))
        .status,
      400,
    );
  });
  await check("framing and MIME protections are present", async () => {
    const response = await request("/hyr");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  });
});
await withServer(randomBytes(16).toString("hex"), async (request) => {
  await check("site lock renders the coming-soon page", async () => {
    const response = await request("/kerko");
    assert.equal(response.status, 200);
    assert.match(await response.text(), /shpejti/i);
  });
  await check("locked APIs return JSON 423", async () => {
    const response = await request("/api/catalog");
    assert.equal(response.status, 423);
    assert.match(response.headers.get("content-type"), /application\/json/);
  });
  await check(
    "worker and webhook retain their own authentication through the site lock",
    async () => {
      assert.equal((await request("/api/cron/escrow")).status, 403);
      assert.equal(
        (await request("/api/stripe/webhook", { method: "POST", body: "{}" }))
          .status,
        400,
      );
    },
  );
  await check("locked site excludes crawling", async () => {
    const response = await request("/robots.txt");
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Disallow: \/\s/);
  });
});
console.log(
  `${checks} no-database smoke checks passed. Database-backed behavior is covered in the isolated integration job.`,
);
