import type { Metadata } from "next";
import { Flag, Star, ThumbsUp, Trash2 } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, StatCard, SectionTitle } from "@/components/account/Bits";
import { adminNav } from "@/lib/nav";
import { flaggedReviews } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Moderimi i vlerësimeve — Admin Zgjoi" };

const admin = { name: "Rrustem Gashi", initials: "RG", hue: 38, caption: "Administrator" };

export default function AdminReviewsPage() {
  return (
    <AccountShell
      title="Moderimi i vlerësimeve"
      subtitle="Vlerësime të raportuara për shqyrtim: mashtrim, gjuhë e papërshtatshme ose konflikt."
      nav={adminNav}
      user={admin}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Në radhë" value={String(flaggedReviews.length)} hint="presin vendim" />
        <StatCard label="Të aprovuara sot" value="14" hint="publikuar" />
        <StatCard label="Të fshira këtë javë" value="3" hint="shkelje të rregullave" />
      </div>

      <div className="mt-8">
        <SectionTitle>Radha e moderimit</SectionTitle>
        <div className="space-y-4">
          {flaggedReviews.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-ink">
                    {r.author} → {r.pro}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < r.rating ? "fill-gold text-gold" : "text-line"}
                        />
                      ))}
                    </span>
                    · {r.date} · #{r.id}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-[#FDF0F0] px-3 py-1 text-xs font-bold text-[#B4232A]">
                  <Flag size={12} /> E raportuar
                </span>
              </div>

              <blockquote className="mt-4 rounded-xl bg-cream p-4 text-sm leading-relaxed text-ink">
                &ldquo;{r.text}&rdquo;
              </blockquote>

              <p className="mt-3 text-sm text-muted">
                <b className="text-ink">Arsyeja:</b> {r.reason}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                <button className="flex items-center gap-1.5 rounded-full bg-gold px-5 py-2 text-xs font-bold text-ink hover:bg-gold-dark">
                  <ThumbsUp size={13} /> Publiko
                </button>
                <button className="flex items-center gap-1.5 rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted hover:border-ink hover:text-ink">
                  <Trash2 size={13} /> Fshi vlerësimin
                </button>
                <button className="rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted hover:border-gold hover:text-gold-dark">
                  Kontakto autorin
                </button>
                <button className="rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted hover:border-gold hover:text-gold-dark">
                  Pezullo llogarinë
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AccountShell>
  );
}
