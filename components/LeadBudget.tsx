"use client";

import { useState } from "react";
import { Check, Info, Target } from "lucide-react";
import { leadBudget } from "@/lib/account";
import { categories, cities } from "@/lib/data";

export default function LeadBudget() {
  const [weekly, setWeekly] = useState(leadBudget.weekly);
  const [radius, setRadius] = useState(leadBudget.radius);
  const [auto, setAuto] = useState(leadBudget.autoBid);
  const [cats, setCats] = useState<string[]>(["elektricist", "riparime"]);
  const [towns, setTowns] = useState<string[]>(leadBudget.cities);
  const [saved, setSaved] = useState(false);

  const spent = leadBudget.spent;
  const pct = Math.min(100, Math.round((spent / weekly) * 100));
  const leadsLeft = Math.max(0, Math.floor((weekly - spent) / leadBudget.leadCost));

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const chip = (on: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
      on
        ? "border-gold bg-honey text-ink"
        : "border-line bg-white text-muted hover:border-gold hover:text-gold-dark"
    }`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <Target size={19} className="text-gold-dark" /> Buxheti javor
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Sa je i gatshëm të shpenzosh në javë për kërkesa të reja. Çdo kërkesë
            e hapur kushton rreth {leadBudget.leadCost}€.
          </p>

          <p className="mt-6 text-4xl font-extrabold text-ink">{weekly}€</p>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={weekly}
            onChange={(e) => {
              setWeekly(Number(e.target.value));
              setSaved(false);
            }}
            className="mt-4 w-full accent-[#FFB800]"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>10€</span>
            <span>200€</span>
          </div>

          <div className="mt-6 rounded-xl bg-cream p-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Shpenzuar këtë javë</span>
              <span className="font-bold text-ink">
                {spent}€ nga {weekly}€
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-sm text-muted">
              Të mbeten rreth <b className="text-ink">{leadsLeft} kërkesa</b> për
              këtë javë.
            </p>
          </div>

          <label className="mt-6 flex items-start gap-3 rounded-xl border border-line p-4">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => {
                setAuto(e.target.checked);
                setSaved(false);
              }}
              className="mt-0.5 h-4 w-4 accent-[#FFB800]"
            />
            <span>
              <span className="block text-sm font-bold text-ink">
                Targetim automatik
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                Zgjoi t&apos;i dërgon automatikisht kërkesat që përputhen me
                kategoritë dhe rrezen tënde, brenda buxhetit.
              </span>
            </span>
          </label>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-extrabold text-ink">Ku dhe çfarë punësh</h2>

          <p className="mt-5 text-sm font-bold text-ink">Kategoritë</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {categories.slice(0, 8).map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  toggle(cats, setCats, c.slug);
                  setSaved(false);
                }}
                className={chip(cats.includes(c.slug))}
              >
                {c.name}
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm font-bold text-ink">Qytetet</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {cities.slice(0, 7).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  toggle(towns, setTowns, c);
                  setSaved(false);
                }}
                className={chip(towns.includes(c))}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm font-bold text-ink">
            Rrezja e udhëtimit: <span className="text-gold-dark">{radius} km</span>
          </p>
          <input
            type="range"
            min={5}
            max={80}
            step={5}
            value={radius}
            onChange={(e) => {
              setRadius(Number(e.target.value));
              setSaved(false);
            }}
            className="mt-3 w-full accent-[#FFB800]"
          />

          <button
            onClick={() => setSaved(true)}
            className="mt-7 flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-sm font-bold text-ink transition-all hover:bg-gold-dark hover:shadow-lift"
          >
            {saved && <Check size={16} />}
            {saved ? "Ndryshimet u ruajtën" : "Ruaj cilësimet"}
          </button>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-gold bg-white p-6 shadow-card">
          <h2 className="text-sm font-extrabold text-ink">Si funksionon</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
            <li className="flex gap-2.5">
              <Info size={15} className="mt-0.5 shrink-0 text-gold-dark" />
              Paguan vetëm kur hap një kërkesë dhe dërgon ofertë — jo për
              shfaqje.
            </li>
            <li className="flex gap-2.5">
              <Info size={15} className="mt-0.5 shrink-0 text-gold-dark" />
              Kur buxheti javor mbaron, nuk të vijnë kërkesa të reja deri të
              hënën.
            </li>
            <li className="flex gap-2.5">
              <Info size={15} className="mt-0.5 shrink-0 text-gold-dark" />
              Nëse klienti nuk përgjigjet brenda 48 orësh, kredia të kthehet.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="text-sm font-extrabold text-ink">Java e kaluar</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Kërkesa të hapura</dt>
              <dd className="font-bold text-ink">9</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Oferta të dërguara</dt>
              <dd className="font-bold text-ink">7</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Punë të fituara</dt>
              <dd className="font-bold text-ink">3</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2.5">
              <dt className="text-muted">Kosto për punë</dt>
              <dd className="font-bold text-ink">12€</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
