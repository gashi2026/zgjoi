"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Headset, MessageCircle, X } from "lucide-react";
import Thread from "./marketplace/Thread";
import { supportStatus } from "@/lib/support-hours";
export default function SupportChat({ productionHome = false }: { productionHome?: boolean }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const path = usePathname();
  const referenceHome = productionHome && (path === "/" || path === "/se-shpejti");
  const [withinSupportHours, setWithinSupportHours] = useState(false);
  useEffect(() => {
    if (!referenceHome) return;
    const update = () => setWithinSupportHours(supportStatus().online);
    const frame = requestAnimationFrame(update);
    const timer = setInterval(update, 60_000);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); };
  }, [referenceHome]);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  function close() {
    setOpen(false);
    button.current?.focus();
  }
  return (
    <div className={referenceHome ? "fixed bottom-[110px] right-3 z-50 lg:bottom-[30px]" : "fixed bottom-24 right-4 z-50 lg:bottom-6"}>
      {open && (
        <section
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-label="Mbështetja Zgjoi"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="mb-3 max-h-[70dvh] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-lift"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Mbështetja Zgjoi</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Mbyll bisedën"
              className="p-3"
            >
              <X size={20} />
            </button>
          </div>
          <p className="mb-3 text-xs text-muted">
            Na shkruani këtu. Mesazhet ruhen edhe kur ekipi nuk është online.
            Mos dërgoni fjalëkalime ose të dhëna karte.
          </p>
          <Thread key={path} support />
        </section>
      )}
      <button
        ref={button}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label="Hap mbështetjen"
        className={`relative ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink shadow-lift ${referenceHome ? "active:scale-95" : "border-2 border-white"}`}
      >
        {referenceHome ? (open ? <X size={22} /> : <MessageCircle size={24} />) : <Headset size={25} />}
        {referenceHome && !open && <span aria-hidden="true" className={`absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white ${withinSupportHours ? "bg-green-500" : "bg-gray-400"}`} />}
      </button>
    </div>
  );
}
