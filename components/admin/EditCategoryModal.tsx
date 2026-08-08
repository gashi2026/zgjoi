"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateCategory } from "@/app/actions/admin";

export default function EditCategoryModal({
  cat,
}: {
  cat: { id: string; name: string; slug: string; icon: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-gold hover:text-gold-dark"
      >
        <Pencil size={12} />
        Modifiko
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Mbyll" tabIndex={-1} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-lift sm:p-8">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink"
              aria-label="Mbyll"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-extrabold text-ink">Modifiko kategorinë</h2>
            <p className="mt-1 text-sm text-muted">/{cat.slug}</p>

            <form
              action={async (fd) => { await updateCategory(fd); setOpen(false); }}
              className="mt-5 space-y-4"
            >
              <input type="hidden" name="id" value={cat.id} />
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor={`cn-${cat.id}`}>Emri</label>
                <input
                  id={`cn-${cat.id}`}
                  name="name"
                  defaultValue={cat.name}
                  className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor={`ci-${cat.id}`}>Ikona (emri lucide)</label>
                <input
                  id={`ci-${cat.id}`}
                  name="icon"
                  defaultValue={cat.icon}
                  className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold"
                />
                <p className="mt-1 text-xs text-muted">p.sh. home, zap, sparkles, camera, music, baby, mail…</p>
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark"
              >
                Ruaj ndryshimet
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
