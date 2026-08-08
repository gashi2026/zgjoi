import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flag, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import { Stars } from "@/components/Brand";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { flagReview, removeReview, restoreReview } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vlerësimet — Admin" };

const stateChip: Record<string, { label: string; cls: string }> = {
  PUBLISHED: { label: "Publikuar", cls: "bg-honey text-gold-dark" },
  FLAGGED: { label: "Flamuruar", cls: "bg-orange-50 text-orange-600" },
  REMOVED: { label: "Hequr", cls: "bg-red-50 text-red-600" },
};

export default async function AdminReviewsPage() {
  const me = await currentUser();
  if (!me || me.role !== "ADMIN") redirect("/hyr?next=/admin/vleresimet");

  const reviews = await db.review.findMany({
    include: {
      author: { select: { name: true, email: true } },
      profile: { select: { slug: true, user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const shellUser = { name: me.name, initials: me.name.slice(0, 2).toUpperCase(), hue: 38, caption: "Administrator" };

  return (
    <AccountShell
      title="Vlerësimet"
      subtitle={`${reviews.length} vlerësime — modero përmbajtjen e platformës`}
      nav={adminNav}
      user={shellUser}
    >
      <Card>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-gold-dark" /> Të gjitha vlerësimet
          </span>
        </SectionTitle>

        {reviews.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Ende nuk ka vlerësime. Ato shfaqen këtu sapo klientët të fillojnë të vlerësojnë punët e kryera.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {reviews.map((r) => {
              const chip = stateChip[r.state] ?? stateChip.PUBLISHED;
              return (
                <li key={r.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Stars rating={r.rating} />
                        <span className="text-sm font-bold text-ink">{r.author.name}</span>
                        <span className="text-xs text-muted">→ {r.profile.user.name}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${chip.cls}`}>{chip.label}</span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink">{r.text}</p>
                      {r.flagReason && (
                        <p className="mt-1 text-xs text-orange-600">Arsyeja: {r.flagReason}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {r.state === "PUBLISHED" && (
                        <>
                          <form action={flagReview}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-orange-300 hover:text-orange-600">
                              <Flag size={12} /> Flamuro
                            </button>
                          </form>
                          <form action={removeReview}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:text-red-500">
                              <Trash2 size={12} /> Hiq
                            </button>
                          </form>
                        </>
                      )}
                      {r.state !== "PUBLISHED" && (
                        <form action={restoreReview}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="flex items-center gap-1.5 rounded-full border border-gold bg-honey px-3.5 py-1.5 text-xs font-bold text-gold-dark hover:bg-gold hover:text-ink">
                            <RotateCcw size={12} /> Rikthe
                          </button>
                        </form>
                      )}
                      {r.state === "FLAGGED" && (
                        <form action={removeReview}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:text-red-500">
                            <Trash2 size={12} /> Hiq
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </AccountShell>
  );
}
