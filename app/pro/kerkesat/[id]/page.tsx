import JobDetail from "@/components/marketplace/JobDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <JobDetail id={(await params).id} pro={true} />;
}
