"use client";
import { msgKey } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/messages/sq";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import BeltIcon, { CUSTOM_ICON_KEYS } from "@/components/BeltIcons";
import { useT } from "@/lib/i18n/client";

/* Icons from the shared set, with plain-language labels. */
const SHARED: { key: string; label: MessageKey }[] = [
  { key: "home", label: msgKey("iconPicker.home") },
  { key: "droplets", label: msgKey("iconPicker.waterPlumbing") },
  { key: "zap", label: msgKey("iconPicker.electricity") },
  { key: "sparkles", label: msgKey("iconPicker.cleaning") },
  { key: "paintbrush", label: msgKey("iconPicker.brush") },
  { key: "leaf", label: msgKey("iconPicker.leafGarden") },
  { key: "truck", label: msgKey("iconPicker.truck") },
  { key: "wrench", label: msgKey("iconPicker.wrench") },
  { key: "hammer", label: msgKey("iconPicker.hammer") },
  { key: "wind", label: msgKey("iconPicker.airConditioning") },
  { key: "shield", label: msgKey("iconPicker.shield") },
  { key: "wifi", label: msgKey("iconPicker.internet") },
  { key: "bookOpen", label: msgKey("iconPicker.bookCourses") },
  { key: "globe", label: msgKey("iconPicker.globe") },
  { key: "music", label: msgKey("iconPicker.music") },
  { key: "code", label: msgKey("iconPicker.programming") },
  { key: "calculator", label: msgKey("iconPicker.calculator") },
  { key: "heart", label: msgKey("iconPicker.heart") },
  { key: "dumbbell", label: msgKey("iconPicker.fitness") },
  { key: "apple", label: msgKey("iconPicker.apple") },
  { key: "camera", label: msgKey("iconPicker.camera") },
  { key: "palette", label: msgKey("iconPicker.palette") },
  { key: "video", label: msgKey("iconPicker.video") },
  { key: "car", label: msgKey("iconPicker.car") },
  { key: "scissors", label: msgKey("iconPicker.scissors") },
  { key: "briefcase", label: msgKey("iconPicker.business") },
  { key: "scale", label: msgKey("iconPicker.scales") },
  { key: "megaphone", label: msgKey("iconPicker.marketing") },
  { key: "languages", label: msgKey("iconPicker.translation") },
  { key: "baby", label: msgKey("iconPicker.baby") },
  { key: "mail", label: msgKey("iconPicker.mail") },
  { key: "calendar", label: msgKey("iconPicker.calendar") },
];

const CUSTOM_LABELS: Record<string, MessageKey> = {
  alarm: msgKey("iconPicker.sirenAlarms"),
  notary: msgKey("iconPicker.stampedDocumentNotary"),
  architect: msgKey("iconPicker.compassArchitect"),
  cutlery: msgKey("iconPicker.forkKnifeCatering"),
  chef: msgKey("iconPicker.chefsHat"),
  vet: msgKey("iconPicker.pawCrossVet"),
  welding: msgKey("iconPicker.weldingMask"),
  dogheart: msgKey("iconPicker.dogHeart"),
  towtruck: msgKey("iconPicker.towTruck"),
  medical: msgKey("iconPicker.medicalCross"),
  nails: msgKey("iconPicker.manicure"),
  headphones2: msgKey("iconPicker.headphonesDj"),
  camcorder: msgKey("iconPicker.filmCamera"),
  pentool: msgKey("iconPicker.penToolDesign"),
  dancer: msgKey("iconPicker.dancer"),
  pointe: msgKey("iconPicker.balletShoes"),
  carpenter: msgKey("iconPicker.hammerWood"),
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
  const t = useT();
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
  const reactId = useId();
  const fileId = `icon-file-${reactId.replace(/[^a-zA-Z0-9-]/g, "")}`;

  const value = mode === "own" ? own : picked;
  const field =
    "w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-gold";

  const takeFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("iconPicker.chooseImagePngSvg"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      setOwn(await fileToIcon(file));
    } catch {
      setError(t("iconPicker.couldntReadImageTry"));
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
              {t("iconPicker.fromLibrary")}</button>
            <button
              type="button"
              onClick={() => setMode("own")}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                mode === "own" ? "bg-white text-ink shadow-soft" : "text-muted"
              }`}
            >
              {t("iconPicker.myImage")}</button>
          </div>

          {mode === "library" ? (
            <select id={id} value={picked} onChange={(e) => setPicked(e.target.value)} className={field}>
              <optgroup label={t("iconPicker.drawnZgjoi")}>
                {CUSTOM_ICON_KEYS.map((k) => (
                  <option key={k} value={k}>{CUSTOM_LABELS[k] ? t(CUSTOM_LABELS[k]) : k}</option>
                ))}
              </optgroup>
              <optgroup label={t("iconPicker.general")}>
                {SHARED.map((o) => (
                  <option key={o.key} value={o.key}>{t(o.label)}</option>
                ))}
              </optgroup>
            </select>
          ) : (
            <>
              {/* a plain file input does the heavy lifting — the zone
                  around it just adds drag-and-drop on top */}
              <label
                htmlFor={fileId}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  takeFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                  dragOver ? "border-gold bg-honey" : "border-line bg-cream hover:border-gold"
                }`}
              >
                {busy ? (
                  <Loader2 size={20} className="animate-spin text-gold-dark" />
                ) : (
                  <ImagePlus size={20} className="text-gold-dark" />
                )}
                <span className="text-xs font-bold text-ink">
                  {own.startsWith("data:") ? t("iconPicker.imageUploaded") : t("iconPicker.dragImageHere")}
                </span>
                <span className="text-[11px] text-muted">{t("iconPicker.pngTransparentBackgroundLooks")}</span>
              </label>

              <input
                id={fileId}
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  takeFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
                className="mt-2 block w-full cursor-pointer rounded-xl border border-line bg-white text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-bold file:text-ink hover:file:bg-gold-dark"
              />

              <input
                id={id}
                value={own.startsWith("data:") ? "" : own}
                onChange={(e) => setOwn(e.target.value)}
                placeholder={t("iconPicker.pasteLinkSvgCode")}
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
