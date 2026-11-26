import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { pageGuard } from "@/lib/server/guard";
import { publicProfile } from "@/lib/server/catalog";
import { db } from "@/lib/server/db";
import { categoryFlow, bookableTerms } from "@/lib/server/bookings";
import { money } from "@/lib/format";
import { serviceCategory } from "@/lib/service-categories";
import { bookingTotal, hourOptions, hoursLabel, estimateCredit, LATE_FEE_CENTS, FREE_CANCEL_HOURS } from "@/lib/book-now";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import { SERIES_CADENCES, cadenceOptionLabels, GENERATION_HORIZON_DAYS, MIN_AHEAD_DAYS } from "@/lib/recurring-series";
export const dynamic = "force-dynamic";
const weekdays = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** Book now (hourly): the customer picks a start and hours at or above the
 * pro's minimum; total = rate × hours, paid upfront (beta: confirmed by Zgjoi). */
export default async function Page({ searchParams }: { searchParams: Promise<{ pro?: string }> }) {
  const actor = await pageGuard("CLIENT");
  const { pro: id } = await searchParams;
  if (!id) redirect("/kerko");
  const pro = await publicProfile(id);
  if (!pro) notFound();
  const terms = bookableTerms(pro, await categoryFlow(db, pro.categorySlug));
  if (!terms) redirect(`/kerkesa-e-re?pro=${pro.id}`);
  const estimates = await db.estimate.findMany({ where: { clientId: actor.id, profileId: pro.id, state: "PAID", creditedRequestId: null } });
  const credit = estimateCredit(estimates, actor.id, pro.id);
  const category = serviceCategory(pro.categorySlug)?.name ?? pro.categorySlug;
  return (
    <Frame actor={actor} title={`Rezervo tani · ${pro.user.name}`}
      subtitle={`${category} · ${money(terms.rateCents)}/orë · minimumi ${hoursLabel(terms.minMinutes)}. Totali = tarifa × orët.`}>
      <Panel>
        <h2 className="mb-1 text-lg font-bold">Zgjidhni orarin dhe orët</h2>
        <p className="mb-4 text-sm text-muted">
          Rezervimi paguhet paraprakisht. Gjatë beta-s pagesa nuk bëhet online: ekipi i Zgjoi e konfirmon pagesën
          dhe profesionisti njoftohet. Rezervimi shfaqet si punë në bisedën me {pro.user.name}, me statusin e saj.
        </p>
        {credit.creditCents > 0 && (
          <p className="mb-4 rounded-xl bg-honey p-3 text-sm font-semibold" role="status">
            Keni paguar një vlerësim prej {money(credit.creditCents)} me këtë profesionist. Shuma zbritet plotësisht nga ky rezervim.
          </p>
        )}
        <ApiForm endpoint="/api/bookings" idempotent values={{ profileId: pro.id }} label="Rezervo tani"
          confirmation={`Rezervoni ${pro.user.name}? Totali llogaritet nga ${money(terms.rateCents)}/orë dhe paguhet paraprakisht.`}
          fields={[
            { name: "startsAt", label: "Data dhe ora e fillimit (ora e Kosovës)", type: "datetime-local", kosovoTime: true, required: true,
              hint: "Së paku një orë nga tani. Orari duhet të jetë brenda orarit javor të profesionistit." },
            { name: "minutes", label: "Sa orë?", type: "select", as: "number", required: true, value: String(terms.minMinutes),
              options: hourOptions(terms.minMinutes).map(m => ({ value: String(m), label: `${hoursLabel(m)} · ${money(bookingTotal(terms.rateCents, m))}` })) },
            { name: "repeat", label: "Përsëritja", type: "select", value: "NONE",
              options: [{ value: "NONE", label: "Vetëm një herë" }, ...SERIES_CADENCES.map(c => ({ value: c, label: cadenceOptionLabels[c] }))],
              hint: `Rezervim i përsëritur: çdo vizitë krijohet si rezervim më vete, ${GENERATION_HORIZON_DAYS} ditë përpara (vizita e radhës gjithmonë e rezervuar, së paku ${MIN_AHEAD_DAYS} ditë përpara), me të njëjtat rregulla anulimi. Mund ta pauzoni ose anuloni kur të doni te “Rezervimet e përsëritura”.` },
            { name: "detail", label: "Çfarë duhet bërë?", type: "textarea", required: true, minLength: 10, maxLength: 4000,
              hint: "Pa numra telefoni, email ose lidhje: mesazhi bllokohet i tëri." },
            { name: "city", label: "Qyteti", value: actor.city ?? "", required: true, maxLength: 60 },
            { name: "address", label: "Adresa", maxLength: 300, hint: "Shfaqet te profesionisti pasi pagesa të konfirmohet." },
          ]} />
      </Panel>
      <Panel>
        <h2 className="font-bold">Orari javor i {pro.user.name}</h2>
        {pro.availability.length ? (
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {[...pro.availability].sort((a, b) => a.weekday - b.weekday).map(a => (
              <li key={a.weekday}>{weekdays[a.weekday]}: {clock(a.startMin)}–{clock(a.endMin)}</li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">Profesionisti nuk ka caktuar orar javor; çdo orë është e lirë nëse nuk ka rezervim tjetër.</p>}
      </Panel>
      <Panel>
        <h2 className="font-bold">Anulimi</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Më shumë se {FREE_CANCEL_HOURS} orë para fillimit: falas, rimbursim i plotë.</li>
          <li>Brenda {FREE_CANCEL_HOURS} orëve: tarifë fikse {money(LATE_FEE_CENTS)}; pjesa tjetër e orëve rimbursohet.</li>
          <li>Nëse profesionisti anulon vonë ose nuk vjen: rimbursim i plotë.</li>
          <li>Nëse nuk ka askënd në shtëpi kur arrin profesionisti: humbni {money(LATE_FEE_CENTS)}.</li>
        </ul>
        <p className="mt-3 text-sm text-muted">Gjatë beta-s, rimbursimet i kryen ekipi i Zgjoi. <Link className="text-gold-dark" href={`/profesionisti/${pro.slug}`}>← Kthehu te profili</Link></p>
      </Panel>
    </Frame>
  );
}
