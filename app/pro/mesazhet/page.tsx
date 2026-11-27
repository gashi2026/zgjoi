import { localRedirect } from "@/lib/i18n/redirect";
// Chat-then-hire: every conversation lives with its job, so the old messages
// list now points to the single conversations list.
export default async function Page() {
  await localRedirect("/pro/kerkesat");
}
