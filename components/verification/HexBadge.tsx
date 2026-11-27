/** Small honeycomb cell used as the status mark on the ID screens. */
export default function HexBadge({ children, tone = "gold", size = 56 }: { children: React.ReactNode; tone?: "gold" | "green" | "red"; size?: number }) {
  const ring = tone === "green" ? "bg-emerald-600" : tone === "red" ? "bg-red-600" : "bg-gold";
  return (
    <div aria-hidden className={`hexframe shrink-0 p-[2px] ${ring}`} style={{ width: size, height: size * 1.1547 }}>
      <div className="hexframe flex h-full w-full items-center justify-center bg-[#FFF9E3] text-xl">{children}</div>
    </div>
  );
}
