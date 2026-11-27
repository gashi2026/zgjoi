"use client";
import { useState } from "react";
import { useRouter, useT } from "@/lib/i18n/client";
import { buttonClass, inputClass } from "./ApiForm";
import CategoryIcon from "@/components/CategoryIcon";

export type ProfessionOption = { slug: string; label: string; icon: string };
export type ProfessionRow = { slug: string; priceFrom: string; approved: boolean };

/** Profile panel: the pro's professions (first = main) and an optional "price from" for each.
 * No price = customers see "ask for a price" and start a chat. */
export default function ProfessionsEditor({ options, initial, max, profileApproved }: {
  options: ProfessionOption[]; initial: ProfessionRow[]; max: number; profileApproved: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [rows, setRows] = useState<ProfessionRow[]>(initial);
  const [adding, setAdding] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const option = (slug: string) => options.find((o) => o.slug === slug);
  const left = options.filter((o) => !rows.some((r) => r.slug === o.slug));
  const update = (i: number, patch: Partial<ProfessionRow>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) => setRows((list) => {
    const next = [...list]; const [row] = next.splice(i, 1); next.splice(i + by, 0, row); return next;
  });

  async function save() {
    if (!rows.length) return setMessage({ text: t("professionsEditor.keepAtLeastOne"), error: true });
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/professions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: rows.map((r) => ({ slug: r.slug, priceFrom: r.priceFrom.trim() })) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        const fieldErrors = Object.values(result.errors ?? {}).flat() as string[];
        throw new Error([result.message || result.error, ...fieldErrors].filter(Boolean).join(" ") || t("professionsEditor.didntSave"));
      }
      setMessage({ text: result.message || t("professionsEditor.saved"), error: false });
      router.refresh();
    } catch (e) {
      setMessage({ text: e instanceof Error ? t.any(e.message) : t("professionsEditor.didntSave"), error: true });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="professions-editor">
      <ul className="space-y-3">
        {rows.map((row, i) => {
          const o = option(row.slug);
          return (
            <li key={row.slug} className="rounded-2xl border border-line bg-[#FFFDF5] p-3" data-testid={`profession-${row.slug}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span aria-hidden className="hexframe flex shrink-0 items-center justify-center bg-gold/30" style={{ width: 40, height: 46 }}>
                  <CategoryIcon name={o?.icon ?? "grid"} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{o?.label ?? row.slug}{i === 0 && <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-gold px-2 py-0.5 align-middle text-xs font-semibold">{t("professionsEditor.main")}</span>}</p>
                  <p className={`text-xs ${row.approved || !profileApproved ? "text-muted" : "font-semibold text-gold-dark"}`}>
                    {row.approved ? t("professionsEditor.approved") : profileApproved ? t("professionsEditor.waitingApproval") : t("professionsEditor.reviewedWithProfile")}
                  </p>
                </div>
                <div className="flex w-full justify-end gap-1 sm:w-auto">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("professionsEditor.moveUp", { name: o?.label ?? row.slug })} className="h-11 w-11 rounded-full border border-line disabled:opacity-30">↑</button>
                  <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={t("professionsEditor.moveDown", { name: o?.label ?? row.slug })} className="h-11 w-11 rounded-full border border-line disabled:opacity-30">↓</button>
                  <button type="button" disabled={rows.length === 1} onClick={() => setRows((list) => list.filter((_, j) => j !== i))} aria-label={t("professionsEditor.remove", { name: o?.label ?? row.slug })} className="h-11 rounded-full border border-line px-3 text-sm disabled:opacity-30">{t("professionsEditor.removeShort")}</button>
                </div>
              </div>
              <label className="mt-3 block text-sm font-semibold">
                {t("professionsEditor.priceFrom")}
                <input inputMode="decimal" value={row.priceFrom} onChange={(e) => update(i, { priceFrom: e.target.value })} placeholder={t("professionsEditor.askForPricePlaceholder")}
                  className={`${inputClass} mt-1 sm:max-w-xs`} aria-label={t("professionsEditor.priceFromFor", { name: o?.label ?? row.slug })} />
                <span className="mt-1 block text-xs font-normal text-muted">{t("professionsEditor.priceHint")}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {rows.length < max && left.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-sm font-semibold">
            {t("professionsEditor.addProfession")}
            <select value={adding} onChange={(e) => setAdding(e.target.value)} className={`${inputClass} mt-1`}>
              <option value="">{t("professionsEditor.choose")}</option>
              {left.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
            </select>
          </label>
          <button type="button" disabled={!adding} onClick={() => { setRows((list) => [...list, { slug: adding, priceFrom: "", approved: false }]); setAdding(""); }}
            className="min-h-11 rounded-full border border-gold px-5 font-semibold disabled:opacity-40">{t("professionsEditor.add")}</button>
        </div>
      )}
      <p className="text-xs text-muted">{t("professionsEditor.upTo", { count: max })} {profileApproved ? t("professionsEditor.newOnesNeedApproval") : ""}</p>
      {message && <p role={message.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${message.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>{message.text}</p>}
      <button type="button" disabled={pending} onClick={save} className={buttonClass}>{pending ? t("professionsEditor.saving") : t("professionsEditor.saveProfessions")}</button>
    </div>
  );
}
