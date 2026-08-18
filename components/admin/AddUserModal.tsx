"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { createUser } from "@/app/actions/admin";
import { subsFor } from "@/lib/subcategories";

const CITIES = [
  "Prishtinë", "Prizren", "Pejë", "Gjakovë", "Gjilan", "Mitrovicë", "Ferizaj",
  "Vushtrri", "Podujevë", "Suharekë", "Rahovec", "Drenas", "Lipjan", "Malishevë",
  "Kaçanik", "Skenderaj", "Viti", "Deçan", "Istog", "Klinë",
];

export default function AddUserModal({
  categoryOptions,
}: {
  categoryOptions: { slug: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("CLIENT");
  const [category, setCategory] = useState(categoryOptions[0]?.slug ?? "");

  const subs = subsFor(category);
  const field =
    "mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold";
  const label = "text-sm font-semibold text-ink";

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
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-lift sm:p-8">
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="au-name">Emri i plotë</label>
                  <input id="au-name" name="name" required minLength={2} className={field} />
                </div>
                <div>
                  <label className={label} htmlFor="au-email">Email</label>
                  <input id="au-email" name="email" type="email" required className={field} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="au-phone">Numri i telefonit</label>
                  <input id="au-phone" name="phone" placeholder="+383 4x xxx xxx" className={field} />
                </div>
                <div>
                  <label className={label} htmlFor="au-pass">Fjalëkalimi (min. 8)</label>
                  <input id="au-pass" name="password" type="text" required minLength={8} className={field} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="au-role">Roli</label>
                  <select
                    id="au-role" name="role" value={role} onChange={(e) => setRole(e.target.value)}
                    className={field}
                  >
                    <option value="CLIENT">Klient</option>
                    <option value="PRO">Profesionist</option>
                    <option value="SUPPORT">Mbështetje</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="au-city">Qyteti</label>
                  <select id="au-city" name="city" className={field} defaultValue="Prishtinë">
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={label} htmlFor="au-avatar">Foto e profilit (URL)</label>
                <input id="au-avatar" name="avatarUrl" placeholder="https://…/foto.jpg" className={field} />
                <p className="mt-1 text-xs text-muted">Ngarko foton diku (p.sh. Supabase Storage) dhe ngjit linkun.</p>
              </div>

              {role === "PRO" && (
                <div className="space-y-4 rounded-2xl border border-line bg-cream/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gold-dark">Të dhënat profesionale</p>

                  <div>
                    <label className={label} htmlFor="au-cat">Profesioni</label>
                    <select
                      id="au-cat" name="categorySlug" value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={field}
                    >
                      {categoryOptions.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {subs.length > 0 && (
                    <div>
                      <label className={label} htmlFor="au-sub">Specializimi</label>
                      <select id="au-sub" name="subcategory" className={field}>
                        <option value="">— të gjitha —</option>
                        {subs.map((s) => (
                          <option key={s.slug} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className={label} htmlFor="au-personal">Numri personal</label>
                    <input id="au-personal" name="personalNo" inputMode="numeric" placeholder="1234567890" className={field} />
                    <p className="mt-1 text-xs text-muted">
                      Ruhen vetëm 4 shifrat e fundit për verifikim.
                    </p>
                  </div>

                  <div>
                    <label className={label} htmlFor="au-price">Çmimi fillestar (€)</label>
                    <input id="au-price" name="priceFrom" type="number" min={1} defaultValue={15} className={field} />
                  </div>
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
