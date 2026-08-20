"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
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

/* Shrink whatever lands here to a small square PNG, kept as text so it
   can live in the database like any other icon value. */
async function fileToIcon(file: File): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read"));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("img"));
    i.src = dataUrl;
  });

  const MAX = 112;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png"); // keeps transparency
}

export default function IconPicker({
  name,
  defaultValue = "sparkles",
  id,
}: {
  name: string;
  defaultValue?: string;
  id?: string;
}) {
  const isOwn = (v: string) => {
    const t = v.trim();
    return t.startsWith("<svg") || /^(https?:\/\/|data:image\/)/i.test(t);
  };

  const [mode, setMode] = useState<"library" | "own">(isOwn(defaultValue) ? "own" : "library");
  const [picked, setPicked] = useState(isOwn(defaultValue) ? "sparkles" : defaultValue);
  const [own, setOwn] = useState(isOwn(defaultValue) ? defaultValue : "");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const value = mode === "own" ? own : picked;
  const field =
    "w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-gold";

  const takeFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Zgjidh një imazh (PNG, SVG, JPG…).");
      return;
    }
    setError("");
    setBusy(true);
    try {
      setOwn(await fileToIcon(file));
    } catch {
      setError("Nuk e lexova dot imazhin — provo një tjetër.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* what will actually be saved */}
      <input type="hidden" name={name} value={value} />

      <div className="flex items-start gap-2">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-honey text-gold-dark">
          {value ? <BeltIcon name={value} size={26} /> : null}
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
            <select id={id} value={picked} onChange={(e) => setPicked(e.target.value)} className={field}>
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
            <>
              {/* drop it here, or tap to browse */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  takeFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                  dragOver ? "border-gold bg-honey" : "border-line bg-cream hover:border-gold"
                }`}
              >
                {busy ? (
                  <Loader2 size={20} className="animate-spin text-gold-dark" />
                ) : (
                  <ImagePlus size={20} className="text-gold-dark" />
                )}
                <span className="text-xs font-bold text-ink">
                  {own.startsWith("data:") ? "Imazhi u ngarkua — kliko për ta ndërruar" : "Tërhiq PNG-në këtu ose kliko"}
                </span>
                <span className="text-[11px] text-muted">PNG me sfond transparent duket më së miri</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  takeFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              <input
                id={id}
                value={own.startsWith("data:") ? "" : own}
                onChange={(e) => setOwn(e.target.value)}
                placeholder="…ose ngjit një link / kod SVG"
                className={`${field} mt-2`}
              />
            </>
          )}

          {error && <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
