import { redirect, notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { publicProfile } from "@/lib/server/catalog";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pro?: string }>;
}) {
  const actor = await pageGuard("CLIENT");
  const { pro: id } = await searchParams;
  if (!id) redirect("/kerko");
  const pro = await publicProfile(id);
  if (!pro) notFound();
  return (
    <Frame
      actor={actor}
      title={`Kërkesë për ${pro.user.name}`}
      subtitle="Këtë kërkesë e sheh vetëm profesionisti i zgjedhur dhe administrata kur nevojitet mbështetje."
    >
      <Panel>
        <ApiForm
          endpoint="/api/requests"
          idempotent
          values={{ profileId: pro.id }}
          label="Dërgo kërkesën private"
          fields={[
            {
              name: "title",
              label: "Çfarë pune ju nevojitet?",
              required: true,
              minLength: 5,
              maxLength: 120,
            },
            {
              name: "detail",
              label: "Detajet e punës",
              type: "textarea",
              required: true,
              minLength: 20,
              maxLength: 4000,
              hint: "Mos përfshini numër telefoni, email ose lidhje para rezervimit.",
            },
            {
              name: "city",
              label: "Qyteti",
              value: actor.city ?? "",
              required: true,
              maxLength: 60,
            },
            {
              name: "timing",
              label: "Kur ju nevojitet shërbimi?",
              required: true,
              minLength: 2,
              maxLength: 120,
            },
            {
              name: "address",
              label: "Adresa (opsionale)",
              maxLength: 200,
              hint: "Shfaqet te profesionisti pasi pagesa të konfirmohet.",
            },
          ]}
        />
      </Panel>
    </Frame>
  );
}
