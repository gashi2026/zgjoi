"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Headset, X } from "lucide-react";
import Thread from "./marketplace/Thread";
export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  function close() {
    setOpen(false);
    button.current?.focus();
  }
  return (
    <div className="fixed bottom-24 right-4 z-50 lg:bottom-6">
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
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-gold text-ink shadow-lift"
      >
        <Headset size={25} />
      </button>
    </div>
  );
}
