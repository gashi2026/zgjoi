"use client";

import CategoryIcon from "@/components/CategoryIcon";
import { useState } from "react";

export const ICON_OPTIONS: { key: string; label: string }[] = [
  { key: "home", label: "Shtëpi / Ndërtim" },
  { key: "droplets", label: "Ujë / Hidraulik" },
  { key: "zap", label: "Rrymë / Elektricist" },
  { key: "sparkles", label: "Pastrim / Shkëlqim" },
  { key: "paintbrush", label: "Furçë / Piktor" },
  { key: "leaf", label: "Gjeth / Kopsht" },
  { key: "truck", label: "Kamion / Transport" },
  { key: "wrench", label: "Çelës / Riparime" },
  { key: "hammer", label: "Çekiç / Mobilje" },
  { key: "wind", label: "Erë / Klimë" },
  { key: "shield", label: "Mburojë / Siguri" },
  { key: "wifi", label: "Wifi / Internet" },
  { key: "bookOpen", label: "Libër / Kurse" },
  { key: "globe", label: "Glob / Gjuhë" },
  { key: "music", label: "Muzikë" },
  { key: "code", label: "Kod / Programim" },
  { key: "calculator", label: "Llogaritëse / Matematikë" },
  { key: "heart", label: "Zemër / Kujdes" },
  { key: "dumbbell", label: "Pesha / Trajner" },
  { key: "apple", label: "Mollë / Ushqim" },
  { key: "camera", label: "Kamerë / Fotograf" },
  { key: "palette", label: "Paletë / Dekor" },
  { key: "headphones", label: "Kufje / DJ" },
  { key: "video", label: "Video / Kameraman" },
  { key: "car", label: "Veturë / Shofer" },
  { key: "star", label: "Yll" },
  { key: "scissors", label: "Gërshërë / Parukeri" },
  { key: "briefcase", label: "Çantë / Biznes" },
  { key: "scale", label: "Peshore / Avokat" },
  { key: "megaphone", label: "Megafon / Marketing" },
  { key: "languages", label: "Përkthim" },
  { key: "baby", label: "Bebe / Dado" },
  { key: "mail", label: "Postë" },
  { key: "calendar", label: "Kalendar / Evente" },
];

/* Select an icon with a live preview next to it. */
export default function IconPicker({
  name,
  defaultValue = "sparkles",
  id,
}: {
  name: string;
  defaultValue?: string;
  id?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex items-center gap-2">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-honey text-gold-dark">
        <CategoryIcon name={value} size={20} />
      </span>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-xl border border-line bg-cream px-3 py-3 text-sm outline-none focus:border-gold"
      >
        {ICON_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
