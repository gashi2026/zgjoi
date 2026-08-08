import type { Metadata } from "next";
import { MapPin, Quote, ShieldCheck, Star, Users, Zap } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Rreth nesh — Zgjoi",
  description: "Mësoni më shumë rreth Zgjoi dhe misionit tonë.",
};

const values = [
  {
    icon: ShieldCheck,
    title: "Besueshmëri",
    body: "Çdo profesionist kalon verifikim të dokumenteve para se të aktivizohet. Klientët dinë me kë kanë të bëjnë.",
  },
  {
    icon: Star,
    title: "Cilësi",
    body: "Vlerësimet janë të vërteta — shkruhen vetëm pas punës së kryer dhe lirimit të pagesës.",
  },
  {
    icon: Zap,
    title: "Shpejtësi",
    body: "Nga kërkesa deri te oferta e parë — zakonisht nën 10 minuta.",
  },
  {
    icon: Users,
    title: "Gjithëpërfshirje",
    body: "36 kategori shërbimesh: nga elektricisti te tutori, nga fotografja te balerina.",
  },
];

export default function RrethNeshPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-cream">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Rreth Zgjoi
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              Zgjoi është platforma që lidh njerëzit e Kosovës me profesionistët
              e besuar pranë tyre — shpejt, me transparencë dhe me pagesë të sigurt.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-line bg-cream p-8 sm:p-12">
              <Quote size={28} className="text-gold" />
              <p className="mt-4 text-xl font-semibold leading-relaxed text-ink sm:text-2xl">
                Kosova ka profesionistë të shkëlqyer. Zgjoi i bën të dukshëm.
              </p>
              <p className="mt-6 text-base leading-relaxed text-muted">
                Ideja lindi nga një problem i thjeshtë: gjetja e një elektricisti, hidrauliku
                apo tutori të besueshëm nuk duhej të ishte punë. Duhet të jetë e lehtë
                si kërkimi në Google — me çmime transparente, vlerësime të vërteta dhe
                pagesë të sigurt.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-cream">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Në çfarë besojmë
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {values.map((v) => (
                <div key={v.title} className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey">
                    <v.icon size={20} className="text-gold-dark" />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold text-ink">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Zgjoi në numra
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { v: "10K+", l: "Klientë të kënaqur" },
                { v: "5K+", l: "Profesionistë aktivë" },
                { v: "50K+", l: "Punë të përfunduara" },
                { v: "36", l: "Kategori shërbimesh" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-line bg-cream p-6 text-center">
                  <p className="text-3xl font-extrabold text-ink">{s.v}</p>
                  <p className="mt-2 text-sm text-muted">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-cream">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold text-ink">Na kontaktoni</h2>
            <p className="mt-3 text-muted">
              Pyetje, partneritete apo feedback — jemi këtu.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <a
                href="mailto:info@zgjoi.com"
                className="rounded-full bg-gold px-7 py-3 text-sm font-bold text-ink hover:bg-gold-dark"
              >
                info@zgjoi.com
              </a>
              <a
                href="/kerko"
                className="rounded-full border border-line bg-white px-7 py-3 text-sm font-semibold text-ink hover:border-gold"
              >
                Kërko profesionist
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
