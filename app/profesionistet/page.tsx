import type { Metadata } from "next";
import Link from "next/link";
import {
  UserRoundPlus,
  BadgeCheck,
  Bell,
  Hammer,
  Landmark,
  ShieldCheck,
  Wallet,
  Receipt,
  TrendingUp,
  CalendarCheck,
  Star,
  Headphones,
} from "lucide-react";
import CTABanner from "@/components/CTABanner";
import { Bee, HexOutline } from "@/components/Brand";

export const metadata: Metadata = {
  title: "Për profesionistët — Zgjoi",
  description:
    "Regjistrohu si profesionist në Zgjoi: si funksionon, si paguhesh dhe si mbrohen paratë e tua.",
};

/* Public marketing page: the exact commission rate is deliberately NOT shown
   here. Professionals see the real figure once they start signing up and
   inside their own portal (lib/account.ts → KOMISIONI). */

const steps = [
  {
    icon: UserRoundPlus,
    title: "Regjistrohu falas",
    text: "Krijo llogarinë, zgjidh kategorinë e shërbimit dhe qytetet ku punon. Nuk ka pagesë për regjistrim dhe as tarifë mujore.",
  },
  {
    icon: BadgeCheck,
    title: "Verifiko identitetin",
    text: "Ngarko dokumentin e identifikimit dhe çdo certifikatë profesionale që ke. Pas kontrollit, profili yt merr shenjën e verifikimit.",
  },
  {
    icon: Bell,
    title: "Merr kërkesa",
    text: "Klientët në zonën tënde të gjejnë përmes kërkimit ose të dërgojnë kërkesë direkte. Ti vendos cilat oferta i pranon.",
  },
  {
    icon: Hammer,
    title: "Kryej punën",
    text: "Merresh vesh me klientin për detajet dhe e kryen punën ashtu si e ke ofertuar. Klienti konfirmon përfundimin në aplikacion.",
  },
  {
    icon: Wallet,
    title: "Merr pagesën",
    text: "Pagesa lirohet pas konfirmimit. Zgjoi mban një përqindje të vlerës si komision dhe pjesa tjetër shkon në llogarinë tënde bankare.",
  },
];

const money = [
  {
    icon: ShieldCheck,
    title: "Paratë mbahen të sigurta",
    text: "Klienti paguan përpara se puna të nisë, por paratë nuk i merr askush. Ato qëndrojnë të bllokuara te Zgjoi derisa puna të përfundojë.",
  },
  {
    icon: Receipt,
    title: "Pa tarifa të fshehura",
    text: "Nga çdo punë të përfunduar mbahet një përqindje e vlerës si komision; pjesa tjetër është e jotja. Nuk ka tarifë regjistrimi, abonimi apo tarifë për oferta. Përqindja e saktë të tregohet qartë para se të konfirmosh regjistrimin.",
  },
  {
    icon: Landmark,
    title: "Gjithçka përmes bankës",
    text: "Të gjitha transaksionet kryhen përmes institucioneve bankare të licencuara. Pa para në dorë dhe pa marrëveshje jashtë platformës.",
  },
];

const benefits = [
  { icon: TrendingUp, title: "Rrit të ardhurat", text: "Kërkesa të reja çdo ditë nga klientë që kërkojnë pikërisht shërbimin tënd." },
  { icon: CalendarCheck, title: "Ti e mban kalendarin", text: "Puno kur do dhe ku do. Ofertat i pranon apo i refuzon vetë." },
  { icon: Star, title: "Reputacion i dukshëm", text: "Vlerësimet e klientëve ndërtojnë profilin tënd dhe të sjellin punë të re." },
  { icon: Headphones, title: "Mbështetje reale", text: "Ekipi ynë ndërhyn nëse diçka shkon keq mes teje dhe klientit." },
];

export default function ProfesionistetPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <span className="inline-block rounded-full border border-gold bg-white px-4 py-1 text-xs font-bold text-gold-dark">
              Për profesionistët
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Puna të gjen ty. <span className="text-gold">Ne kujdesemi për pjesën tjetër.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Regjistrohu falas, merr kërkesa nga klientë realë në qytetin tënd
              dhe paguhu në llogari bankare pas çdo pune të përfunduar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/regjistrohu"
                className="rounded-full bg-gold px-7 py-3 text-sm font-bold text-ink transition-all hover:bg-gold-dark hover:shadow-lift"
              >
                Bëhu profesionist
              </Link>
              <Link
                href="#pagesa"
                className="rounded-full border border-line bg-white px-7 py-3 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold-dark"
              >
                Si paguhem?
              </Link>
            </div>
          </div>
          <div className="hidden justify-center lg:flex">
            <HexOutline size={200} stroke="#FFB800" strokeWidth={2.5} fill="#FFF3CF" shadow>
              <Bee size={78} className="animate-bee-hover" />
            </HexOutline>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Si funksionon për ty
          </h2>

          <ol className="relative mt-12 space-y-10">
            <span
              className="absolute bottom-8 left-[26px] top-8 w-px bg-line"
              aria-hidden="true"
            />
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative flex items-start gap-5 sm:gap-7">
                <span className="relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center">
                  <svg viewBox="0 0 100 112" className="absolute inset-0 h-full w-full" aria-hidden="true">
                    <path d="M50 4 L91 28 L91 84 L50 108 L9 84 L9 28 Z" fill="#FFB800" />
                  </svg>
                  <span className="relative z-10 text-lg font-extrabold text-white">
                    {i + 1}
                  </span>
                </span>
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-extrabold text-ink">
                    <Icon size={18} className="text-gold-dark" strokeWidth={2} />
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Money & security */}
      <section id="pagesa" className="scroll-mt-24 bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Pagesa dhe siguria
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted">
            Asnjë punë nuk fillon pa u siguruar pagesa dhe asnjë pagesë nuk
            lirohet pa u përfunduar puna.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {money.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-line bg-white p-7 shadow-card"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-honey text-gold-dark">
                  <Icon size={24} strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 text-base font-extrabold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>

          {/* Worked example */}
          <div className="mt-8 rounded-2xl border border-gold bg-white p-7 shadow-soft">
            <h3 className="text-base font-extrabold text-ink">
              Një shembull i thjeshtë
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                ["1. Klienti paguan", "Përpara punës", "Shuma bllokohet te Zgjoi, jo te klienti dhe jo te ti."],
                ["2. Puna përfundon", "Konfirmim", "Klienti konfirmon në aplikacion se puna u krye."],
                [
                  "3. Ti paguhesh",
                  "Transfertë bankare",
                  "Shuma, minus komisionin e platformës, kalon në llogarinë tënde.",
                ],
              ].map(([label, value, text]) => (
                <div key={label} className="rounded-xl bg-cream p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Pse të punosh me Zgjoin
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <HexOutline size={78} stroke="#FFB800" strokeWidth={2.5} fill="#FFFCF5">
                  <Icon size={28} className="text-gold-dark" strokeWidth={1.8} />
                </HexOutline>
                <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
                <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
