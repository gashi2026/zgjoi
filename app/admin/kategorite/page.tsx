import type { Metadata } from "next";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, SectionTitle } from "@/components/account/Bits";
import CategoryIcon from "@/components/CategoryIcon";
import { adminNav } from "@/lib/nav";
import { categories } from "@/lib/data";
import { questionsFor } from "@/lib/wizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kategoritë — Admin Zgjoi" };

const admin = { name: "Rrustem Gashi", initials: "RG", hue: 38, caption: "Administrator" };

const typeLabel: Record<string, string> = {
  single: "Një zgjedhje",
  multi: "Shumë zgjedhje",
  number: "Numër",
  text: "Tekst i lirë",
};

export default function AdminCategoriesPage() {
  const sample = questionsFor("piktor");

  return (
    <AccountShell
      title="Kategoritë dhe pyetësorët"
      subtitle="Shto kategori të reja dhe përditëso pyetjet që u shfaqen klientëve në formular."
      nav={adminNav}
      user={admin}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <SectionTitle
            action={
              <button className="flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-bold text-ink hover:bg-gold-dark">
                <Plus size={14} /> Kategori e re
              </button>
            }
          >
            Kategoritë ({categories.length})
          </SectionTitle>

          <Card className="!p-0">
            <ul>
              {categories.map((c) => (
                <li
                  key={c.slug}
                  className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0 hover:bg-cream"
                >
                  <GripVertical size={16} className="shrink-0 text-line" />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-honey">
                    <CategoryIcon name={c.icon} size={18} className="text-gold-dark" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm text-ink">{c.name}</b>
                    <span className="text-xs text-muted">
                      /{c.slug} · {c.count} profesionistë · {questionsFor(c.slug).length} pyetje
                    </span>
                  </span>
                  <button className="text-muted hover:text-gold-dark" aria-label="Ndrysho">
                    <Pencil size={15} />
                  </button>
                  <button className="text-muted hover:text-ink" aria-label="Fshi">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div>
          <SectionTitle>Pyetësori: Piktor</SectionTitle>
          <Card>
            <p className="text-sm text-muted">
              Këto pyetje i shfaqen klientit në hapin e dytë të formularit kur
              zgjedh këtë kategori.
            </p>

            <ul className="mt-5 space-y-3">
              {sample.map((q, i) => (
                <li key={q.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {i + 1}. {q.label}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Fusha: <code className="text-ink">{q.id}</code> ·{" "}
                        {typeLabel[q.type]}
                      </p>
                    </div>
                    <span className="flex gap-2 text-muted">
                      <button className="hover:text-gold-dark" aria-label="Ndrysho">
                        <Pencil size={14} />
                      </button>
                      <button className="hover:text-ink" aria-label="Fshi">
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>

                  {"options" in q && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {q.options.map((o) => (
                        <span
                          key={o}
                          className="rounded-full border border-line bg-cream px-3 py-1 text-xs text-muted"
                        >
                          {o}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="flex items-center gap-1.5 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark">
                <Plus size={15} /> Shto pyetje
              </button>
              <button className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-muted hover:border-gold hover:text-gold-dark">
                Parashiko formularin
              </button>
            </div>
          </Card>
        </div>
      </div>
    </AccountShell>
  );
}
