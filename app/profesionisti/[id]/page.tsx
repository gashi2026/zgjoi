import Link from "next/link";
import { notFound } from "next/navigation";
import { publicProfile, activeCategories } from "@/lib/server/catalog";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { money, dateTime } from "@/lib/format";
import ApiForm from "@/components/marketplace/ApiForm";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pro = await publicProfile(id);
  return {
    title: pro
      ? `${pro.user.name} — ${pro.user.city} | Zgjoi`
      : "Profili nuk u gjet | Zgjoi",
    description: pro?.about.slice(0, 160),
    alternates: { canonical: pro ? `/profesionisti/${pro.slug}` : "/kerko" },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pro = await publicProfile(id);
  if (!pro) notFound();
  const [actor, categories] = await Promise.all([
    currentUser(),
    activeCategories(),
  ]);
  const saved =
    actor?.role === "CLIENT"
      ? Boolean(
          await db.favorite.findUnique({
            where: {
              userId_profileId: { userId: actor.id, profileId: pro.id },
            },
          }),
        )
      : false;
  const weekdays = [
    "E hënë",
    "E martë",
    "E mërkurë",
    "E enjte",
    "E premte",
    "E shtunë",
    "E diel",
  ];
  const clock = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Link href="/kerko" className="text-gold-dark">
        ← Kthehu te kërkimi
      </Link>
      <section className="rounded-2xl border border-line bg-cream p-6">
        <h1 className="text-3xl font-bold">{pro.user.name}</h1>
        <p className="mt-2 text-muted">
          {categories.find((c) => c.slug === pro.categorySlug)?.name} ·{" "}
          {pro.user.city}
        </p>
        <p className="mt-4 whitespace-pre-wrap">{pro.about}</p>
        <p className="mt-4 font-semibold">
          Nga {money(pro.priceFrom)} ·{" "}
          {pro.ratingCount
            ? `★ ${pro.ratingAvg.toFixed(1)} (${pro.ratingCount} vlerësime)`
            : "Pa vlerësime ende"}
        </p>
        <p className="mt-2 text-sm text-muted">
          Çmimi përfundimtar dhe koha përcaktohen në ofertën zyrtare.
        </p>
        <div className="mt-5 flex flex-wrap items-start gap-4">
          <Link
            className="rounded-full bg-gold px-5 py-3 font-semibold"
            href={`/kerkesa-e-re?pro=${pro.id}`}
          >
            Kontakto profesionistin
          </Link>
          {actor?.role === "CLIENT" && (
            <ApiForm
              endpoint="/api/favorites"
              values={{ profileId: pro.id, saved: !saved }}
              label={
                saved ? "Hiq nga të preferuarit" : "Ruaj te të preferuarit"
              }
            />
          )}
        </div>
      </section>
      <section className="rounded-2xl border border-line p-6">
        <h2 className="text-xl font-bold">Shërbimet dhe zona</h2>
        <p className="mt-2">{pro.serviceCities.join(", ") || pro.user.city}</p>
        {pro.services.map((s) => (
          <p key={s.id} className="mt-2">
            {s.name} · nga {money(s.price)}
          </p>
        ))}
        <h3 className="mt-5 font-bold">Orari i zakonshëm</h3>
        <p className="text-sm text-muted">
          Orari nuk garanton disponueshmëri; konfirmohet në ofertë. Ora e
          Kosovës.
        </p>
        {pro.availability.length ? (
          pro.availability
            .sort((a, b) => a.weekday - b.weekday)
            .map((a) => (
              <p key={a.weekday}>
                {weekdays[a.weekday]}: {clock(a.startMin)}–{clock(a.endMin)}
              </p>
            ))
        ) : (
          <p>Diskutoni orarin me profesionistin.</p>
        )}
      </section>
      <section>
        <h2 className="text-xl font-bold">
          Vlerësimet nga punë të përfunduara
        </h2>
        {!pro.reviews.length && (
          <p className="mt-3 text-muted">
            Ky profesionist nuk ka vlerësime ende.
          </p>
        )}
        {pro.reviews.map((r) => (
          <article
            key={r.id}
            className="mt-4 rounded-2xl border border-line p-5"
          >
            <p className="font-semibold">
              {r.author.name
                .split(/\s+/)
                .map((n) => n[0])
                .join(".")}
              . · {r.rating}/5
            </p>
            <p className="mt-2 whitespace-pre-wrap">{r.text}</p>
            <time className="text-xs text-muted">{dateTime(r.createdAt)}</time>
          </article>
        ))}
      </section>
    </div>
  );
}
