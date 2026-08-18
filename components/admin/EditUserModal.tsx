"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateUser } from "@/app/actions/admin";

const CITIES = [
  "Prishtinë", "Prizren", "Pejë", "Gjakovë", "Gjilan", "Mitrovicë", "Ferizaj",
  "Vushtrri", "Podujevë", "Suharekë", "Rahovec", "Drenas", "Lipjan", "Malishevë",
  "Kaçanik", "Skenderaj", "Viti", "Deçan", "Istog", "Klinë",
];

export default function EditUserModal({
  user,
}: {
  user: {
    id: string; name: string; city: string | null;
    phone: string | null; email: string; avatarUrl?: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const field =
    "mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-gold";

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
          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-lift sm:p-8">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink"
              aria-label="Mbyll"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-extrabold text-ink">Modifiko përdoruesin</h2>
            <p className="mt-1 text-sm text-muted">{user.email}</p>

            <form
              action={async (fd) => { await updateUser(fd); setOpen(false); }}
              className="mt-5 space-y-4"
            >
              <input type="hidden" name="id" value={user.id} />
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor={`n-${user.id}`}>Emri</label>
                <input id={`n-${user.id}`} name="name" defaultValue={user.name} className={field} />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor={`c-${user.id}`}>Qyteti</label>
                <select id={`c-${user.id}`} name="city" defaultValue={user.city ?? ""} className={field}>
                  <option value="">—</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor={`p-${user.id}`}>Telefoni</label>
                <input id={`p-${user.id}`} name="phone" defaultValue={user.phone ?? ""} className={field} />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor={`a-${user.id}`}>Foto e profilit (URL)</label>
                <input id={`a-${user.id}`} name="avatarUrl" defaultValue={user.avatarUrl ?? ""} placeholder="https://…/foto.jpg" className={field} />
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
