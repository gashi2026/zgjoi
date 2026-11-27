import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { publicProfile } from "@/lib/server/catalog";
import { db } from "@/lib/server/db";
import { dateTime, stateLabel } from "@/lib/format";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import { IdGate } from "@/components/verification/IdNotice";
/** Chat-then-hire: the customer opens a private chat with one chosen pro and
 * describes the job as the first message. There is no public job posting. */
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
  const open = await db.serviceRequest.findMany({
    where: {
      clientId: actor.id,
      selectedProfileId: pro.id,
      state: { in: ["OPEN", "QUOTED", "BOOKED", "IN_PROGRESS"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, title: true, state: true, updatedAt: true },
  });
  return (
    <Frame
      actor={actor}
      title={`Bisedë me ${pro.user.name}`}
      subtitle={`Biseda është private: e shihni vetëm ju dhe ${pro.user.name}. Administrata e sheh vetëm kur kërkoni mbështetje.`}
    >
      {open.length > 0 && (
        <Panel>
          <h2 className="font-bold">Keni tashmë biseda të hapura me {pro.user.name}</h2>
          <ul className="mt-3 space-y-2">
            {open.map((r) => (
              <li key={r.id}>
                <Link className="font-semibold text-gold-dark" href={`/llogaria/kerkesat/${r.id}`}>
                  {r.title} →
                </Link>
                <span className="ml-2 text-xs text-muted">
                  {stateLabel(r.state)} · {dateTime(r.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">Për një punë tjetër, hapni një bisedë të re më poshtë.</p>
        </Panel>
      )}
      <Panel>
        <h2 className="mb-1 text-lg font-bold">Përshkruani punën</h2>
        <p className="mb-4 text-sm text-muted">
          Ky është mesazhi juaj i parë. {pro.user.name} ju përgjigjet në bisedë dhe ju dërgon një ofertë me çmim.
          Ju e punësoni me butonin “Puneso” vetëm kur jeni dakord.
        </p>
        <IdGate actor={actor}>
        <ApiForm
          endpoint="/api/requests"
          idempotent
          values={{ profileId: pro.id }}
          label="Fillo bisedën"
          fields={[
            {
              name: "detail",
              label: "Çfarë pune ju nevojitet?",
              type: "textarea",
              required: true,
              minLength: 20,
              maxLength: 4000,
              hint: "Mos përfshini numër telefoni, email ose lidhje para rezervimit: mesazhi bllokohet i tëri.",
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
              label: "Kur ju nevojitet shërbimi? (opsionale)",
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
        </IdGate>
      </Panel>
    </Frame>
  );
}
