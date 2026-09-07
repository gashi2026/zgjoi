import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { databaseFailureDetails } from "./error-diagnostics";

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) {
    throw new AppError(
      "ORIGIN",
      403,
      "Kërkesa nuk u pranua. Rifreskoni faqen.",
    );
  }
}

export async function readJson(
  req: Request,
  maxBytes = 16_384,
): Promise<unknown> {
  if (
    !req.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new AppError(
      "CONTENT_TYPE",
      415,
      "Formati i kërkesës nuk është i vlefshëm.",
    );
  }
  const raw = await readBody(req, maxBytes);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("INVALID", 400, "Kërkesa nuk është e vlefshme.");
  }
}

export async function readBody(
  req: Request,
  maxBytes: number,
): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) throw new AppError("INVALID", 400, "Kërkesa është bosh.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AppError("TOO_LARGE", 413, "Kërkesa është tepër e madhe.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function api(req: Request, handler: () => Promise<unknown>) {
  try {
    if (!["GET", "HEAD"].includes(req.method)) sameOrigin(req);
    const result = await handler();
    return result instanceof Response ? result : json(result);
  } catch (error) {
    if (error instanceof AppError)
      return json(
        {
          ok: false,
          code: error.code,
          error: error.message,
          message: error.message,
        },
        error.status,
      );
    if (error instanceof ZodError)
      return json(
        {
          ok: false,
          code: "INVALID",
          message: "Kontrolloni fushat e formularit.",
          errors: error.flatten().fieldErrors,
        },
        400,
      );
    const requestId = randomUUID();
    console.error(
      JSON.stringify({
        event: "request_failed",
        requestId,
        type: error instanceof Error ? error.name : "Unknown",
        ...databaseFailureDetails(error),
      }),
    );
    return json(
      {
        ok: false,
        message:
          "Shërbimi nuk është i disponueshëm për momentin. Provoni përsëri.",
        requestId,
      },
      503,
    );
  }
}

export function requestIp(values: Headers) {
  const value = (
    values.get("x-vercel-forwarded-for") ||
    values.get("x-forwarded-for") ||
    "unknown"
  )
    .split(",")[0]
    .trim();
  return /^[\da-fA-F:.]{3,64}$/.test(value) ? value : "unknown";
}
