import Dashboard from "@/components/marketplace/Dashboard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.min(
    1000,
    Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1),
  );
  return <Dashboard pro={true} view="requests" page={page} />;
}
