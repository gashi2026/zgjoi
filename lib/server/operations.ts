import "server-only";
import { db } from "./db";
import { maintenanceState } from "../operations";
import { accountEmailSetup } from "./notifications";
export async function operationalHealth() {
  const now = Date.now();
  const emailSetup = accountEmailSetup();
  const [heartbeat, failed, overdue, processing] = await Promise.all([
    db.setting.findUnique({ where: { key: "maintenanceHeartbeat" }, select: { value: true } }),
    db.outbox.count({ where: { kind: "EMAIL", state: "FAILED" } }),
    db.outbox.count({ where: { kind: "EMAIL", state: "PENDING", availableAt: { lte: new Date(now - 15 * 60000) } } }),
    db.outbox.count({ where: { kind: "EMAIL", state: "PROCESSING", lockedAt: { lt: new Date(now - 5 * 60000) } } }),
  ]);
  return {
    checkedAt: new Date(now).toISOString(),
    environment: process.env.VERCEL_ENV === "preview" ? "PREVIEW" : "OTHER",
    maintenance: maintenanceState(heartbeat?.value, now),
    emailConfigured: Object.values(emailSetup).every(Boolean),
    emailSetup,
    documentsConfigured: Boolean(process.env.DOCUMENT_UPLOADS_ENABLED === "true" && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    mail: { failed, overdue, processingExpired: processing },
  };
}
