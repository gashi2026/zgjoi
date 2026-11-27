"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter, useT } from "@/lib/i18n/client";
import { buttonClass } from "@/components/marketplace/ApiForm";

export default function AdminProfessionsForm({
  userId,
  max,
  options,
  selected,
}: {
  userId: string;
  max: number;
  options: { slug: string; label: string }[];
  selected: string[];
}) {
  const t = useT();
  const router = useRouter();
  const inFlight = useRef(false);
  const [picked, setPicked] = useState<string[]>(selected);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  function toggle(slug: string) {
    setMessage("");
    setPicked((list) => {
      if (list.includes(slug)) return list.filter((s) => s !== slug);
      if (list.length >= max) {
        setMessage(t("adminPros.upTo", { max }));
        return list;
      }
      return [...list, slug];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!picked.length) { setOk(false); setMessage(t("adminPros.noneSelected")); return; }
    inFlight.current = true;
    setPending(true);
    setMessage("");
    setOk(false);
    try {
      const response = await fetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "USER_SET_PROFESSIONS", id: userId, categories: picked }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.message || result.error || t("apiForm.didntWorkPleaseTry"));
      setOk(true);
      setMessage(result.message || t("apiForm.done"));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("apiForm.connectionFailedFormSaved"));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3" data-testid="admin-set-professions" aria-busy={pending}>
      <h3 className="font-bold">{t("adminPros.setProfessions")}</h3>
      <p className="text-sm text-muted">{t("adminPros.setProfessionsIntro", { max })}</p>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {options.map((o) => {
          const on = picked.includes(o.slug);
          return (
            <label key={o.slug} className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${on ? "bg-honey" : "hover:bg-cream"}`}>
              <input type="checkbox" name="categories" value={o.slug} checked={on} onChange={() => toggle(o.slug)} className="h-4 w-4 accent-[#E0A800]" />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
      <p className="text-sm" role="status">{t("signupWizard.selectedCount", { count: picked.length, max })}</p>
      {message && <p role={ok ? "status" : "alert"} className={`rounded-xl p-3 text-sm ${ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>{message}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>{pending ? t("apiForm.processing") : t("adminPros.saveProfessions")}</button>
    </form>
  );
}
