export const metadata = { robots: { index: false, follow: false } };
import { pageGuard } from "@/lib/server/guard";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await pageGuard("CLIENT");
  return children;
}
