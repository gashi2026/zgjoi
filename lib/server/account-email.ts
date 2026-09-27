import "server-only";
import { after } from "next/server";
import { deliverAccountEmail } from "./notifications";

/** Account responses never wait for the provider or reveal whether an address exists. */
export function scheduleAccountEmail(jobId?: string) {
  if (!jobId) return;
  after(async () => {
    try {
      await deliverAccountEmail(jobId);
    } catch {
      // Leave the durable job for recovery; never log tokens, recipients or provider responses.
      console.error(JSON.stringify({ event: "account_email_attempt_failed" }));
    }
  });
}
