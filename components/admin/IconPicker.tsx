"use client";

import { useState } from "react";
import BeltIcon, { CUSTOM_ICON_KEYS } from "@/components/BeltIcons";

/* Icons from the shared set, with plain-language labels. */
const SHARED: { key: string; label: string }[] = [
  { key: "home", label: "Shtëpi" },
  { key: "droplets", label: "Ujë / Hidraulik" },
  { key: "zap", label: "Rrymë" },
  { key: "sparkles", label: "Pastrim" },
  { key: "paintbrush", label: "Furçë" },
  { key: "leaf", label: "Gjeth / Kopsht" },
  { key: "truck", label: "Kamion" },
  { key: "wrench", label: "Çelës" },
  { key: "hammer", label: "Çekiç" },
  { key: "wind", label: "Klimë" },
  { key: "shield", label: "Mburojë" },
  { key: "wifi", label: "Internet" },
  { key: "bookOpen", label: "Libër / Kurse" },
  { key: "globe", label: "Glob" },
  { key: "music", label: "Muzikë" },
  { key: "code", label: "Programim" },
  { key: "calculator", label: "Llogaritëse" },
  { key: "heart", label: "Zemër" },
  { key: "dumbbell", label: "Fitnes" },
  { key: "apple", label: "Mollë" },
  { key: "camera", label: "Kamerë" },
  { key: "palette", label: "Paletë" },
  { key: "video", label: "Video" },
  { key: "car", label: "Veturë" },
  { key: "scissors", label: "Gërshërë" },
  { key: "briefcase", label: "Biznes" },
  { key: "scale", label: "Peshore" },
  { key: "megaphone", label: "Marketing" },
  { key: "languages", label: "Përkthim" },
  { key: "baby", label: "Bebe" },
  { key: "mail", label: "Postë" },
  { key: "calendar", label: "Kalendar" },
];

const CUSTOM_LABELS: Record<string, string> = {
  alarm: "Sirenë (Alarme)",
  notary: "Dokument me vulë (Noter)",
  architect: "Kompas & vizore (Arkitekt)",
  cutlery: "Pirun & thikë (Ushqime)",
  chef: "Kapelë kuzhinieri",
  vet: "Putër me kryq (Veterinar)",
  welding: "Maskë saldimi",
  dogheart: "Qen me zemër",
  towtruck: "Kamion tërheqës",
  medical: "Kryq mjekësor",
  nails: "Manikyr",
  headphones2: "Kufje (DJ)",
  camcorder: "Kamerë filmimi",
  pentool: "Pen tool (Dizajn)",
  dancer: "Valltar",
  pointe: "Këpucë baleti",
  carpenter: "Çekiç & dru",
};

export default function IconPicker({
  name,
  defaultValue = "sparkles",
  id,
}: {
  name: string;
  defaultValue?: string;
  id?: string;
}) {
  const isCustomValue = (v: string) =>
    v.trim().startsWith("<svg") || /^https?:\/\//i.test(v.trim());

  const [mode, setMode] = useState<"library" | "own">(
    isCustomValue(defaultValue) ? "own" : "library"
  );
  const [picked, setPicked] = useState(isCustomValue(defaultValue) ? "sparkles" : defaultValue);
  const [own, setOwn] = useState(isCustomValue(defaultValue) ? defaultValue : "");

  const value = mode === "own" ? own : picked;
  const field =
    "w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-gold";

  return (
    <div className="space-y-2">
      {/* what will actually be saved */}
      <input type="hidden" name={name} value={value} />

      <div className="flex items-center gap-2">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey text-gold-dark">
          {value ? <BeltIcon name={value} size={24} /> : null}
        </span>

        <div className="flex-1">
          <div className="mb-1.5 flex gap-1 rounded-full bg-cream p-1">
            <button
              type="button"
              onClick={() => setMode("library")}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                mode === "library" ? "bg-white text-ink shadow-soft" : "text-muted"
              }`}
            >
              Nga libraria
            </button>
            <button
              type="button"
              onClick={() => setMode("own")}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                mode === "own" ? "bg-white text-ink shadow-soft" : "text-muted"
              }`}
            >
              Imazhi im
            </button>
          </div>

          {mode === "library" ? (
            <select
              id={id}
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              className={field}
            >
              <optgroup label="Të vizatuara për Zgjoi">
                {CUSTOM_ICON_KEYS.map((k) => (
                  <option key={k} value={k}>{CUSTOM_LABELS[k] ?? k}</option>
                ))}
              </optgroup>
              <optgroup label="Të përgjithshme">
                {SHARED.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </optgroup>
            </select>
          ) : (
            <textarea
              id={id}
              rows={2}
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              placeholder="https://…/ikona.svg  ose  <svg …>…</svg>"
              className={field}
            />
          )}
        </div>
      </div>

      {mode === "own" && (
        <p className="text-xs text-muted">
          Ngjit linkun e një imazhi (SVG ose PNG me sfond transparent), ose kodin
          e plotë SVG. Ikonat me vija të holla ari duken më mirë me pjesën tjetër.
        </p>
      )}
    </div>
  );
}
