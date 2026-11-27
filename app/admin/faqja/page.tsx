import { localRedirect } from "@/lib/i18n/redirect";

export default async function FaqjaRedirect() {
  await localRedirect("/admin/kategorite");
}
