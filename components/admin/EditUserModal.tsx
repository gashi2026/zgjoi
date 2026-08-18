"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateUser, updateProProfile } from "@/app/actions/admin";
import { subsFor } from "@/lib/subcategories";

const CITIES = [
  "Prishtinë", "Prizren", "Pejë", "Gjakovë", "Gjilan", "Mitrovicë", "Ferizaj",
  "Vushtrri", "Podujevë", "Suharekë", "Rahovec", "Drenas", "Lipjan", "Malishevë",
  "Kaçanik", "Skenderaj", "Viti", "Deçan", "Istog", "Klinë",
];

export type ProData = {
  id: string;
  categorySlug: string;
  about: string;
  experience: string | null;
  priceFrom: number;         // cents
  radiusKm: number;
  serviceCities: string[];
  verification: string;
  ibanLast4: string | null;
  subcategory: string | null;
};

export default function EditUserModal({
  user,
  pro,
  categoryOptions,
  isSelf,
}: {
  user: {
    id: string; name: string; email: string; city: string | null;
    phone: string | null; role: string; personalNoLast4: string | null;
    avatarUrl?: string | null;
  };
  pro?: ProData | null;
  categoryOptions: { slug: string; name: string }[];
  isSelf?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"account" | "pro">("account");
  const [category, setCategory] = useState(pro?.categorySlug ?? "");

  const subs = subsFor(category);
  const field =
    "mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold";
  const label = "text-sm font-semibold text-ink";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-gold hover:text-gold-dark"
      >
        <Pencil size={12} /> Modifiko
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

            <h2 className="text-lg font-extrabold text-ink">{user.name}</h2>
            <p className="mt-1 text-sm text-muted">{user.email}</p>

            {pro && (
              <div className="mt-4 flex gap-1 rounded-full bg-cream p-1">
                <button
                  type="button"
                  onClick={() => setTab("account")}
                  className={`flex-1 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    tab === "account" ? "bg-white text-ink shadow-soft" : "text-muted"
                  }`}
                >
                  Llogaria
                </button>
                <button
                  type="button"
                  onClick={() => setTab("pro")}
                  className={`flex-1 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    tab === "pro" ? "bg-white text-ink shadow-soft" : "text-muted"
                  }`}
                >
                  Profili profesional
                </button>
              </div>
            )}

            {/* ---------------------------------------------- account */}
            {(!pro || tab === "account") && (
              <form
                action={async (fd) => { await updateUser(fd); setOpen(false); }}
                className="mt-5 space-y-4"
              >
                <input type="hidden" name="id" value={user.id} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor={`n-${user.id}`}>Emri i plotë</label>
                    <input id={`n-${user.id}`} name="name" defaultValue={user.name} className={field} />
                  </div>
                  <div>
                    <label className={label} htmlFor={`e-${user.id}`}>Email</label>
                    <input id={`e-${user.id}`} name="email" type="email" defaultValue={user.email} className={field} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor={`p-${user.id}`}>Telefoni</label>
                    <input id={`p-${user.id}`} name="phone" defaultValue={user.phone ?? ""} className={field} />
                  </div>
                  <div>
                    <label className={label} htmlFor={`c-${user.id}`}>Qyteti</label>
                    <select id={`c-${user.id}`} name="city" defaultValue={user.city ?? ""} className={field}>
                      <option value="">—</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor={`r-${user.id}`}>Roli</label>
                    <select
                      id={`r-${user.id}`} name="role" defaultValue={user.role}
                      disabled={isSelf} className={`${field} disabled:opacity-60`}
                    >
                      <option value="CLIENT">Klient</option>
                      <option value="PRO">Profesionist</option>
                      <option value="SUPPORT">Mbështetje</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    {isSelf && <p className="mt-1 text-xs text-muted">S&apos;mund ta ndryshosh rolin tënd.</p>}
                  </div>
                  <div>
                    <label className={label} htmlFor={`pn-${user.id}`}>Numri personal</label>
                    <input
                      id={`pn-${user.id}`} name="personalNo" inputMode="numeric"
                      placeholder={user.personalNoLast4 ? `····${user.personalNoLast4}` : "1234567890"}
                      className={field}
                    />
                  </div>
                </div>

                <div>
                  <label className={label} htmlFor={`a-${user.id}`}>Foto e profilit (URL)</label>
                  <input id={`a-${user.id}`} name="avatarUrl" defaultValue={user.avatarUrl ?? ""} placeholder="https://…/foto.jpg" className={field} />
                </div>

                <div>
                  <label className={label} htmlFor={`pw-${user.id}`}>Fjalëkalim i ri</label>
                  <input id={`pw-${user.id}`} name="password" type="text" minLength={8} placeholder="lëre bosh për ta mos ndryshuar" className={field} />
                </div>

                <button className="w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark">
                  Ruaj llogarinë
                </button>
              </form>
            )}

            {/* ------------------------------------------ pro profile */}
            {pro && tab === "pro" && (
              <form
                action={async (fd) => { await updateProProfile(fd); setOpen(false); }}
                className="mt-5 space-y-4"
              >
                <input type="hidden" name="profileId" value={pro.id} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor={`cat-${pro.id}`}>Profesioni</label>
                    <select
                      id={`cat-${pro.id}`} name="categorySlug"
                      value={category || pro.categorySlug}
                      onChange={(e) => setCategory(e.target.value)}
                      className={field}
                    >
                      {categoryOptions.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={label} htmlFor={`sub-${pro.id}`}>Specializimi</label>
                    <select id={`sub-${pro.id}`} name="subcategory" defaultValue={pro.subcategory ?? ""} className={field}>
                      <option value="">— të gjitha —</option>
                      {subs.map((s) => <option key={s.slug} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={label} htmlFor={`ab-${pro.id}`}>Përshkrimi</label>
                  <textarea id={`ab-${pro.id}`} name="about" rows={3} defaultValue={pro.about} className={field} />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={label} htmlFor={`pf-${pro.id}`}>Çmimi nga (€)</label>
                    <input id={`pf-${pro.id}`} name="priceFrom" type="number" min={1} step="0.5" defaultValue={(pro.priceFrom / 100).toFixed(2)} className={field} />
                  </div>
                  <div>
                    <label className={label} htmlFor={`rk-${pro.id}`}>Rrezja (km)</label>
                    <input id={`rk-${pro.id}`} name="radiusKm" type="number" min={1} defaultValue={pro.radiusKm} className={field} />
                  </div>
                  <div>
                    <label className={label} htmlFor={`vf-${pro.id}`}>Verifikimi</label>
                    <select id={`vf-${pro.id}`} name="verification" defaultValue={pro.verification} className={field}>
                      <option value="PENDING">Në pritje</option>
                      <option value="APPROVED">Aprovuar</option>
                      <option value="REJECTED">Refuzuar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={label} htmlFor={`ex-${pro.id}`}>Përvoja</label>
                  <input id={`ex-${pro.id}`} name="experience" defaultValue={pro.experience ?? ""} placeholder="p.sh. 8 vjet" className={field} />
                </div>

                <div>
                  <label className={label} htmlFor={`sc-${pro.id}`}>Qytetet e shërbimit</label>
                  <input id={`sc-${pro.id}`} name="serviceCities" defaultValue={pro.serviceCities.join(", ")} placeholder="Prishtinë, Ferizaj" className={field} />
                  <p className="mt-1 text-xs text-muted">Ndaji me presje.</p>
                </div>

                <div>
                  <label className={label} htmlFor={`ib-${pro.id}`}>IBAN (për pagesa)</label>
                  <input
                    id={`ib-${pro.id}`} name="iban"
                    placeholder={pro.ibanLast4 ? `····${pro.ibanLast4}` : "XK00 0000 0000 0000 0000"}
                    className={field}
                  />
                  <p className="mt-1 text-xs text-muted">Ruhen vetëm 4 shifrat e fundit.</p>
                </div>

                <button className="w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark">
                  Ruaj profilin
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
