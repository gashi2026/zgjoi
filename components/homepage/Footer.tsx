"use client";
import { msgKey } from "@/lib/i18n/translate";

import Link from "@/components/i18n/Link";
import { useState } from "react";
import { Facebook, Instagram, Linkedin, ArrowRight } from "lucide-react";
import { Logo } from "../Brand";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import { categories } from "@/lib/homepage-reference-data";
import { useT } from "@/lib/i18n/client";

const columns: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: msgKey("footer.categories"),
    items: categories.slice(0, 5).map((c) => ({
      label: c.name,
      href: `/kerko?kategoria=${c.slug}`,
    })),
  },
  {
    title: msgKey("footer.pros"),
    items: [
      { label: msgKey("footer.becomePro"), href: "/profesionistet" },
      { label: msgKey("footer.contactPrivately"), href: "/kerko" },
      { label: msgKey("footer.proDashboard"), href: "/pro/paneli" },
      { label: msgKey("footer.howWorks"), href: "/si-funksionon" },
      { label: msgKey("footer.guides"), href: "/si-funksionon" },
      { label: msgKey("footer.findPro"), href: "/kerko" },
    ],
  },
  {
    title: msgKey("footer.support"),
    items: [
      { label: msgKey("footer.helpCentre"), href: "/rreth-nesh" },
      { label: msgKey("footer.safety"), href: "/rreth-nesh" },
      { label: msgKey("footer.termsUse"), href: "/kushtet" },
      { label: msgKey("footer.privacyPolicy"), href: "/privatesia" },
    ],
  },
  {
    title: msgKey("footer.company"),
    items: [
      { label: msgKey("footer.aboutUs"), href: "/rreth-nesh" },
      { label: msgKey("footer.contact"), href: "/rreth-nesh" },
      { label: msgKey("footer.careers"), href: "/rreth-nesh" },
      { label: msgKey("footer.myAccount"), href: "/llogaria" },
      { label: msgKey("footer.admin"), href: "/admin" },
    ],
  },
];

export default function Footer() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "unavailable">("idle");

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      return;
    }
    setState("unavailable");
  }

  return (
    <footer data-homepage-reference="zgjoi.com" className="homepage-reference-footer border-t border-line bg-white pb-24 lg:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-3">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {t("footer.zgjoiConnectsVettedLocal")}</p>
            <div className="mt-5 flex gap-3">
              {[
                { icon: Facebook, label: "Facebook" },
                { icon: Instagram, label: "Instagram" },
                { icon: Linkedin, label: "LinkedIn" },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold hover:text-gold-dark"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm text-muted">
              <span>{t("common.language")}</span>
              <LanguageSwitcher />
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-6">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-bold text-ink">{t.any(col.title)}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted transition-colors hover:text-gold-dark"
                      >
                        {t.any(item.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-bold text-ink">{t("footer.subscribeNews")}</h3>
            <p className="mt-3 text-sm text-muted">
              {t("footer.getOurBestNews")}</p>
            <form onSubmit={subscribe} className="mt-4" noValidate>
              <div className="flex overflow-hidden rounded-full border border-line bg-cream focus-within:border-gold">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setState("idle");
                  }}
                  placeholder={t("footer.email")}
                  aria-label={t("footer.email")}
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted"
                />
                <button
                  type="submit"
                  aria-label={t("footer.subscribe")}
                  className="m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-ink transition-colors hover:bg-gold-dark"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
              {state === "error" && (
                <p className="mt-2 text-xs text-red-600">
                  {t("footer.enterValidEmailAddress")}</p>
              )}
              {state === "unavailable" && (
                <p className="mt-2 text-xs text-gold-dark">
                  {t("footer.newsletterIsntActiveYet")}</p>
              )}
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <p>{t("footer.n2026ZgjoiAllRights")}</p>
          <div className="flex gap-6">
            <Link href="/privatesia" className="hover:text-gold-dark">
              {t("footer.privacy")}</Link>
            <Link href="/kushtet" className="hover:text-gold-dark">
              {t("footer.terms")}</Link>
            <Link href="/rreth-nesh" className="hover:text-gold-dark">
              {t("footer.contact")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
