"use client";
import { useEffect, useRef, useState } from "react";
import { useBarePathname as usePathname } from "@/lib/i18n/client";
import { Headset, MessageCircle, X } from "lucide-react";
import Thread from "./marketplace/Thread";
import { LogoMark } from "./Brand";
import { formatSupportStatus, supportStatus, type SupportStatus } from "@/lib/support-hours";
import { useT } from "@/lib/i18n/client";
import { panelOpensDown } from "@/lib/support-launcher";
import { useMagneticLauncher } from "./useMagneticLauncher";

export default function SupportChat({
  productionHome = false,
  defaultOpen = false,
  now,
}: {
  productionHome?: boolean;
  defaultOpen?: boolean;
  /** Fixed instant, used by tests and previews. */
  now?: Date;
}) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const path = usePathname();
  const referenceHome = productionHome && (path === "/" || path === "/se-shpejti");
  const [status, setStatus] = useState<SupportStatus>(() => supportStatus(now));
  const launcher = useMagneticLauncher({ productionHome: referenceHome });
  useEffect(() => {
    const update = () => setStatus(supportStatus(now));
    const frame = requestAnimationFrame(update);
    if (now) return () => cancelAnimationFrame(frame);
    const timer = setInterval(update, 60_000);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); };
  }, [now]);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  function close() {
    setOpen(false);
    button.current?.focus();
  }
  const statusLine = formatSupportStatus(status, t);
  const side = launcher.pos?.side ?? "right";
  const openDown =
    open && launcher.pos && launcher.bounds
      ? panelOpensDown(launcher.pos.y, launcher.bounds)
      : false;
  const defaultClass = referenceHome
    ? "fixed bottom-[110px] right-3 z-50 lg:bottom-[30px]"
    : "fixed bottom-24 right-4 z-50 lg:bottom-6";
  const placed = launcher.pos != null;

  return (
    <div
      className={placed ? "fixed z-50" : defaultClass}
      data-support-launcher=""
      data-side={side}
      data-dragging={launcher.dragging ? "true" : "false"}
      style={
        placed
          ? {
              top: launcher.pos!.y,
              left: launcher.pos!.x,
              width: launcher.buttonSize,
              transition: launcher.transition,
            }
          : undefined
      }
    >
      {open && (
        <section
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-label={t("supportChat.zgjoiSupport")}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className={`flex max-h-[70dvh] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lift ${
            placed
              ? `absolute ${openDown ? "top-full mt-3" : "bottom-full mb-3"} ${
                  side === "left" ? "left-0" : "right-0"
                }`
              : "mb-3"
          }`}
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-line bg-cream px-4 py-3">
            <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden="true">
              <LogoMark size={36} />
              <span
                className={`absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-cream ${status.online ? "bg-green-500" : "bg-gray-400"}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold leading-tight">{t("supportChat.zgjoiSupport")}</h2>
              <p className={`mt-0.5 text-xs font-semibold ${status.online ? "text-green-700" : "text-muted"}`}>
                {status.online ? t("supportChat.online") : t("supportChat.offline")}
              </p>
              <p className="text-xs text-muted">{statusLine}</p>
              <p className="text-xs text-muted">{t("supportChat.hoursLabel")}</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t("supportChat.closeChat")}
              className="-mr-2 -mt-1 shrink-0 p-3"
            >
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {status.online && (
              <p className="mb-3 text-xs text-muted">
                {t("supportChat.writeUsHereMessages")}</p>
            )}
            <Thread
              key={path}
              support
              note={!status.online ? t("supportChat.offlineNote") : undefined}
            />
          </div>
        </section>
      )}
      <button
        ref={button}
        type="button"
        onPointerDown={launcher.onPointerDown}
        onPointerMove={launcher.onPointerMove}
        onPointerUp={(event) => {
          if (launcher.endPointer(event) === "tap") {
            if (open) close();
            else setOpen(true);
          }
        }}
        onPointerCancel={(event) => {
          launcher.endPointer(event);
        }}
        onClick={(event) => {
          // Pointer-up already toggles a tap. Swallow the leftover click
          // so a drag never opens the chat and a tap is not fired twice.
          event.preventDefault();
        }}
        aria-expanded={open}
        aria-label={
          status.online
            ? t("supportChat.openSupport")
            : t("supportChat.openSupportOffline")
        }
        aria-grabbed={launcher.dragging}
        style={{ touchAction: "none", width: 56, height: 56 }}
        className={`relative flex items-center justify-center rounded-full bg-gold text-ink shadow-lift ${
          placed ? "" : "ml-auto"
        } ${referenceHome ? "active:scale-95" : "border-2 border-white"} ${
          launcher.dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {referenceHome ? (open ? <X size={22} /> : <MessageCircle size={24} />) : <Headset size={25} />}
        {!open && (
          <span
            aria-hidden="true"
            className={`absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white ${status.online ? "bg-green-500" : "bg-gray-400"}`}
          />
        )}
      </button>
    </div>
  );
}
