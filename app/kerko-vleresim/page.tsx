import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { publicProfile } from "@/lib/server/catalog";
import { db } from "@/lib/server/db";
import { categoryFlow } from "@/lib/server/bookings";
import { money } from "@/lib/format";
import { ESTIMATE_PRO_SHARE_CENTS, ESTIMATE_PLATFORM_SHARE_CENTS } from "@/lib/book-now";
import { serviceCategory } from "@/lib/service-categories";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import { IdGate } from "@/components/verification/IdNotice";
export const dynamic = "force-dynamic";
/** Paid estimate visit (Elektricist, Mjeshtër i Ujit): €15, credited in full
 * if the customer hires this pro by any path. Beta: Zgjoi confirms the payment. */
export default async function Page({ searchParams }: { searchParams: Promise<{ pro?: string }> }) {
  const actor = await pageGuard("CLIENT");
  const { pro: id } = await searchParams;
  if (!id) redirect("/kerko");
  const pro = await publicProfile(id);
  if (!pro) notFound();
  const flow = await categoryFlow(db, pro.categorySlug);
  if (!flow.estimate || !flow.estimatePriceCents) redirect(`/kerkesa-e-re?pro=${pro.id}`);
  const price = money(flow.estimatePriceCents);
  const open = await db.estimate.findFirst({ where: { clientId: actor.id, profileId: pro.id, state: { in: ["PENDING", "PAID"] } } });
  const category = serviceCategory(pro.categorySlug)?.name ?? pro.categorySlug;
  return (
    <Frame actor={actor} title={`Vizitë vlerësimi · ${pro.user.name}`}
      subtitle={`${category} · ${price}. Profesionisti vjen, e shikon punën dhe ju dërgon çmimin në bisedë.`}>
      <Panel>
        <h2 className="mb-1 text-lg font-bold">Si funksionon</h2>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
          <li>Vizita e vlerësimit kushton {price} dhe paguhet paraprakisht. Gjatë beta-s pagesa nuk bëhet online: ekipi i Zgjoi e konfirmon.</li>
          <li>Nëse më pas e punësoni {pro.user.name} (me “Rezervo tani” ose me “Puneso” në bisedë), {price} zbriten plotësisht nga totali.</li>
          <li>Komisioni i Zgjoi llogaritet mbi çmimin e plotë të punës; ju paguani totalin minus {price}.</li>
          <li>Nëse nuk e punësoni, vlerësimi nuk kthehet: {money(ESTIMATE_PRO_SHARE_CENTS)} shkojnë te profesionisti për vizitën dhe {money(ESTIMATE_PLATFORM_SHARE_CENTS)} te Zgjoi.</li>
        </ul>
        {open ? (
          <p className="rounded-xl bg-honey p-3 text-sm font-semibold" role="status">
            {open.state === "PAID"
              ? `Keni një vlerësim të paguar me ${pro.user.name}; ${money(open.amountCents)} zbriten kur e punësoni.`
              : `Keni një kërkesë vlerësimi në pritje me ${pro.user.name}.`}{" "}
            {open.requestId && <Link className="underline" href={`/llogaria/kerkesat/${open.requestId}`}>Hape bisedën</Link>}
          </p>
        ) : (
          <IdGate actor={actor}>
          <ApiForm endpoint="/api/estimates" idempotent values={{ profileId: pro.id }} label={`Kërko vlerësim · ${price}`}
            confirmation={`Kërkoni një vizitë vlerësimi nga ${pro.user.name} për ${price}?`}
            fields={[
              { name: "visitAt", label: "Kur ju përshtatet vizita? (ora e Kosovës)", type: "datetime-local", kosovoTime: true, required: true,
                hint: "Profesionisti e konfirmon ose propozon një orë tjetër në bisedë." },
              { name: "detail", label: "Çfarë duhet parë?", type: "textarea", required: true, minLength: 10, maxLength: 4000,
                hint: "Pa numra telefoni, email ose lidhje: mesazhi bllokohet i tëri." },
              { name: "city", label: "Qyteti", value: actor.city ?? "", required: true, maxLength: 60 },
              { name: "address", label: "Adresa", maxLength: 300 },
            ]} />
          </IdGate>
        )}
        <p className="mt-3 text-sm text-muted"><Link className="text-gold-dark" href={`/profesionisti/${pro.slug}`}>← Kthehu te profili</Link></p>
      </Panel>
    </Frame>
  );
}
