"use client";
import { useRef, useState } from "react";
import { donutSegments, type TrustSummary } from "@/lib/trust";

const R = 100, r = 72, C = 110;
const pt = (rad: number, ang: number) => [C + rad * Math.cos(ang), C + rad * Math.sin(ang)];
function arc(a: number, b: number): string {
  // A full ring cannot be drawn as one arc; split it in two halves.
  if (b - a >= 2 * Math.PI - 1e-6) return `${arc(a, a + Math.PI)} ${arc(a + Math.PI, b)}`;
  const lg = b - a > Math.PI ? 1 : 0, [x1, y1] = pt(R, a), [x2, y2] = pt(R, b), [x3, y3] = pt(r, b), [x4, y4] = pt(r, a);
  return `M${x1},${y1}A${R},${R} 0 ${lg} 1 ${x2},${y2}L${x3},${y3}A${r},${r} 0 ${lg} 0 ${x4},${y4}Z`;
}

/** Trust history: jobs on time (green), late (gold) and not finished (red),
 * with hover, tap and keyboard-focus tooltips. Mockup: trust-donut-circle.html. */
export default function TrustDonut({ summary }: { summary: TrustSummary }) {
  const { total, rows } = donutSegments(summary);
  const card = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);
  const shown = rows.filter(row => row.value > 0);
  const segments = shown.map((row, i) => {
    const before = shown.slice(0, i).reduce((sum, x) => sum + x.value, 0);
    const a = -Math.PI / 2 + (2 * Math.PI * before) / total, b = a + (2 * Math.PI * row.value) / total;
    return { ...row, d: arc(a, b), mid: (a + b) / 2 };
  });
  const place = (i: number, clientX: number, clientY: number) => {
    const box = card.current?.getBoundingClientRect();
    if (box) setTip({ i, x: clientX - box.left + 12, y: clientY - box.top - 14 });
  };
  const focus = (i: number, mid: number, target: SVGPathElement) => {
    const box = card.current?.getBoundingClientRect(), svg = target.ownerSVGElement?.getBoundingClientRect();
    if (!box || !svg) return;
    const [mx, my] = pt(R, mid);
    setTip({ i, x: svg.left - box.left + (mx * svg.width) / 220, y: svg.top - box.top + (my * svg.height) / 220 - 30 });
  };
  const active = tip ? rows.findIndex(row => row.key === segments[tip.i]?.key) : -1;
  const onTimePct = rows[0].pct;
  return (
    <div ref={card} className="relative mt-5 w-full max-w-sm rounded-3xl border border-line bg-white p-5 shadow-soft" aria-label="Historiku i punëve">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-honey"><span className="h-3 w-3 rounded-full bg-gold-dark" /></span>
        <h2 className="flex-1 text-base font-extrabold">Historiku i punëve</h2>
        <span className="text-xs text-muted">{summary.booked} {summary.booked === 1 ? "punë e rezervuar" : "punë të rezervuara"}</span>
      </div>
      <svg viewBox="0 0 220 220" className="mx-auto my-3 block h-48 w-48" role="img"
        aria-label={total ? `Në kohë ${rows[0].pct}%, me vonesë ${rows[1].pct}%, pa përfunduar ${rows[2].pct}%` : "Ende pa punë të përfunduara"}>
        {!total && <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke="#ECE7DD" strokeWidth={R - r} />}
        {segments.map((seg, i) => (
          <path key={seg.key} d={seg.d} fill={seg.color} stroke="#fff" strokeWidth={segments.length > 1 ? 3 : 0} tabIndex={0}
            aria-label={`${seg.label}: ${seg.pct}%, ${seg.value} punë`}
            className="cursor-pointer outline-none transition-transform duration-150 hover:scale-[1.06] focus:scale-[1.06]"
            style={{ transformOrigin: "110px 110px" }}
            onMouseMove={e => place(i, e.clientX, e.clientY)} onClick={e => place(i, e.clientX, e.clientY)}
            onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)} onFocus={e => focus(i, seg.mid, e.currentTarget)} />
        ))}
        <text x="110" y="113" textAnchor="middle" fontSize="31" fontWeight="800" fill="#111">{total ? `${onTimePct}%` : "—"}</text>
        <text x="110" y="135" textAnchor="middle" fontSize="12" fontWeight="600" fill="#E89D00">{total ? "në kohë" : "pa punë ende"}</text>
      </svg>
      {tip && segments[tip.i] && (
        <div role="tooltip" className="pointer-events-none absolute z-10 whitespace-nowrap rounded-full border-[1.5px] border-gold bg-white px-2.5 py-1.5 text-xs font-semibold shadow"
          style={{ left: tip.x, top: tip.y }}>
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: segments[tip.i].color }} />
          {segments[tip.i].label} · {segments[tip.i].pct}% · {segments[tip.i].value} punë
        </div>
      )}
      <ul className="space-y-1.5">
        {rows.map((row, i) => (
          <li key={row.key} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${i === active ? "border-gold bg-honey" : "border-line bg-cream"}`}>
            <span className="flex items-center"><span className="mr-2.5 inline-block h-3 w-3 rounded-full" style={{ background: row.color }} />{row.label}</span>
            <b>{row.value} · {row.pct}%</b>
          </li>
        ))}
      </ul>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-cream px-3 py-2"><dt className="text-muted">Kontestet</dt><dd className="font-bold">{summary.disputes}</dd></div>
        <div className="rounded-xl bg-cream px-3 py-2"><dt className="text-muted">Anulime (90 ditë)</dt><dd className="font-bold">{summary.cancellations}</dd></div>
      </dl>
      <p className="mt-2 text-center text-[11px] text-muted">Vonesë = fillim më shumë se 15 minuta pas orës së rezervuar.</p>
    </div>
  );
}
