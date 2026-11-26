import Link from "next/link";
import { db } from "@/lib/server/db";
import type { Actor } from "@/lib/server/auth";
import { money, dateTime } from "@/lib/format";
import { bookingTotal, hoursLabel, FREE_CANCEL_HOURS, LATE_FEE_CENTS } from "@/lib/book-now";
import { seriesLabel, seriesStatusLabels, GENERATION_HORIZON_DAYS, seriesCommissionBps } from "@/lib/recurring-series";
import { serviceCategory } from "@/lib/service-categories";
import { Panel } from "./Frame";
import ApiForm from "./ApiForm";

/** Customer and pro view of their recurring Book now schedules. */
export default async function SeriesList({ actor }: { actor: Actor }) {
  const pro = actor.role === "PRO";
  const now = new Date();
  const list = await db.recurringSeries.findMany({
    where: pro ? { profileId: actor.proProfile?.id ?? "missing" } : { clientId: actor.id },
    orderBy: [{ createdAt: "desc" }], take: 50,
    include: {
      profile: { select: { slug: true, user: { select: { name: true } } } },
      bookings: { where: { startsAt: { gte: new Date(now.getTime() - 86_400_000) } }, orderBy: { startsAt: "asc" }, take: 6,
        select: { id: true, requestId: true, startsAt: true, status: true, totalCents: true, request: { select: { payment: { select: { state: true } } } } } },
    },
  });
  const clients = pro ? new Map((await db.user.findMany({ where: { id: { in: list.map(s => s.clientId) } }, select: { id: true, name: true } })).map(u => [u.id, u.name])) : null;
  const order = ["PROPOSED", "ACTIVE", "PAUSED", "CANCELLED", "DECLINED"];
  list.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const jobHref = (requestId: string) => `${pro ? "/pro" : "/llogaria"}/kerkesat/${requestId}`;
  return (
    <>
      <Panel>
        <h2 className="text-lg font-bold">Si funksionon</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>E njëjta ditë dhe orë, çdo javë ose çdo dy javë. Çdo vizitë krijohet si rezervim më vete {GENERATION_HORIZON_DAYS} ditë përpara dhe paguhet paraprakisht (gjatë beta-s e konfirmon Zgjoi).</li>
          <li>Anulimi i një vizite: falas deri {FREE_CANCEL_HOURS} orë para; më vonë {money(LATE_FEE_CENTS)} (10 € profesionisti, 5 € Zgjoi). Nëse profesionisti anulon vonë ose nuk vjen: rimbursim i plotë.</li>
          <li>Pauza ose anulimi i serisë anulon falas vizitat që janë më shumë se {FREE_CANCEL_HOURS} orë larg; vizitat brenda {FREE_CANCEL_HOURS} orëve mbeten.</li>
          {pro && <li>Komisioni i Zgjoi për rezervimet e përsëritura është {seriesCommissionBps("pastrim") / 100}% (në vend të 15%).</li>}
        </ul>
      </Panel>
      {!list.length && (
        <Panel>
          <p className="text-sm text-muted">
            {pro
              ? "Nuk keni rezervime të përsëritura. Mund t’i propozoni klientit një përsëritje nga karta e rezervimit në bisedë."
              : "Nuk keni rezervime të përsëritura. Zgjidhni “Çdo javë” ose “Çdo dy javë” kur rezervoni me “Rezervo tani”."}
          </p>
        </Panel>
      )}
      {list.map(s => {
        const who = pro ? clients?.get(s.clientId) ?? "Klienti" : s.profile.user.name;
        const category = serviceCategory(s.categorySlug)?.name ?? s.categorySlug;
        return (
          <Panel key={s.id}>
            <article aria-label={`Rezervim i përsëritur me ${who}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{category} · {who}</p>
                <span className="rounded-full bg-honey px-3 py-1 text-xs font-semibold">{seriesStatusLabels[s.status] ?? s.status}</span>
              </div>
              <p className="mt-2 text-lg font-bold">{seriesLabel(s)}</p>
              <p className="text-sm">{hoursLabel(s.minutes)} × {money(s.hourlyRateCents)}/orë = <strong>{money(bookingTotal(s.hourlyRateCents, s.minutes))}</strong> për vizitë</p>
              <p className="text-xs text-muted">Nga {dateTime(s.firstStartsAt)} · {s.city}{s.proposedBy === "PRO" ? " · propozuar nga profesionisti" : ""}</p>
              {s.statusNote && <p className="mt-2 rounded-xl bg-cream p-2 text-sm" role="status">{s.statusNote}</p>}
              {s.bookings.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {s.bookings.map(b => (
                    <li key={b.id}>
                      <Link className="text-gold-dark underline" href={jobHref(b.requestId)}>{dateTime(b.startsAt)}</Link>
                      {" · "}{money(b.totalCents)} · {b.status === "CANCELLED" ? "Anuluar" : b.request.payment?.state === "HELD" ? "E paguar" : "Pagesa në pritje"}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                {s.status === "PROPOSED" && !pro && <>
                  <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "CONFIRM" }} label="Konfirmo përsëritjen"
                    confirmation={`Konfirmoni ${seriesLabel(s)}? Çdo vizitë paguhet paraprakisht si rezervim.`} />
                  <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "DECLINE" }} label="Jo, faleminderit" />
                </>}
                {s.status === "PROPOSED" && pro && <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "CANCEL" }} label="Tërhiq propozimin" />}
                {s.status === "ACTIVE" && <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "PAUSE" }} label="Pauzo"
                  confirmation="Vizitat më shumë se 24 orë larg anulohen falas; ato brenda 24 orëve mbeten. Vazhdoni?" />}
                {s.status === "PAUSED" && <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "RESUME" }} label="Rifillo" />}
                {["ACTIVE", "PAUSED"].includes(s.status) && <ApiForm endpoint={`/api/recurring/${s.id}`} values={{ action: "CANCEL" }} label="Anulo serinë"
                  confirmation="Anuloni rezervimin e përsëritur? Vizitat më shumë se 24 orë larg anulohen falas; ato brenda 24 orëve mbeten me rregullat e zakonshme." />}
              </div>
            </article>
          </Panel>
        );
      })}
    </>
  );
}
