import { localRedirect } from "@/lib/i18n/redirect";
export default async function Page() {
  await localRedirect("/pro/profili");
}
