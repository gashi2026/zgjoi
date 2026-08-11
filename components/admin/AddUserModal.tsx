"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { createUser } from "@/app/actions/admin";

export default function AddUserModal({
  categoryOptions,
}: {
  categoryOptions: { slug: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("CLIENT");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-ink shadow-soft transition-colors hover:bg-gold-dark"
      >
        <UserPlus size={15} /> Shto përdorues
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Mbyll" tabIndex={-1} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-lift sm:p-8">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink"
              aria-label="Mbyll"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-extrabold text-ink">Shto përdorues të ri</h2>
            <p className="mt-1 text-sm text-muted">Llogaria krijohet menjëherë, pa verifikim emaili.</p>

            <form
              action={async (fd) => { await createUser(fd); setOpen(false); }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor="au-name">Emri i plotë</label>
                <input id="au-name" name="name" required minLength={2}
                  className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor="au-email">Email</label>
                <input id="au-email" name="email" type="email" required
                  className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor="au-pass">Fjalëkalimi (min. 8)</label>
                <input id="au-pass" name="password" type="text" required minLength={8}
                  className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-ink" htmlFor="au-role">Roli</label>
                  <select
                    id="au-role" name="role" value={role} onChange={(e) => setRole(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line bg-cream px-3 py-3 text-sm outline-none focus:border-gold"
                  >
                    <option value="CLIENT">Klient</option>
                    <option value="PRO">Profesionist</option>
                    <option value="SUPPORT">Mbështetje</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-ink" htmlFor="au-city">Qyteti</label>
                  <input id="au-city" name="city"
                    className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold" />
                </div>
              </div>

              {role === "PRO" && (
                <div>
                  <label className="text-sm font-semibold text-ink" htmlFor="au-cat">Kategoria e shërbimit</label>
                  <select
                    id="au-cat" name="categorySlug"
                    className="mt-1.5 w-full rounded-xl border border-line bg-cream px-3 py-3 text-sm outline-none focus:border-gold"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted">Profili krijohet i verifikuar automatikisht.</p>
                </div>
              )}

              <button className="w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark">
                Krijo llogarinë
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
