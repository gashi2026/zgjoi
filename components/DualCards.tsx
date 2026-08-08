import Link from "next/link";
import { Check, Smartphone, HardHat } from "lucide-react";
import { Bee, HexOutline } from "./Brand";

function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-2.5 text-sm text-ink">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-honey">
            <Check size={12} className="text-gold-dark" strokeWidth={3} />
          </span>
          {b}
        </li>
      ))}
    </ul>
  );
}

/* Illustrated placeholder inside a hexagon frame */
function HexIllustration({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="relative mx-auto" role="img" aria-label={label}>
      <HexOutline size={170} stroke="#FFB800" strokeWidth={2.5} fill="#FFF3CF" shadow>
        <div className="flex flex-col items-center gap-2 text-gold-dark">
          {icon}
        </div>
      </HexOutline>
    </div>
  );
}

export default function DualCards() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative grid gap-6 lg:grid-cols-2 lg:gap-10">
          {/* Card 1 — clients */}
          <div className="rounded-3xl border border-line bg-white p-7 shadow-card sm:p-9">
            <div className="grid items-center gap-8 sm:grid-cols-2">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-ink">
                  Për klientët
                </h2>
                <BenefitList
                  items={[
                    "Gjej profesionistët më të vlerësuar",
                    "Krahaso oferta dhe komente",
                    "Paguaj vetëm pas përfundimit",
                  ]}
                />
                <Link
                  href="/kerko"
                  className="mt-7 inline-block rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-all hover:bg-gold-dark hover:shadow-lift"
                >
                  Gjej shërbim
                </Link>
              </div>
              <HexIllustration
                label="Klientë duke shfletuar shërbime në telefon"
                icon={<Smartphone size={56} strokeWidth={1.6} />}
              />
            </div>
          </div>

          {/* Card 2 — professionals */}
          <div className="rounded-3xl border border-line bg-white p-7 shadow-card sm:p-9">
            <div className="grid items-center gap-8 sm:grid-cols-2">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-ink">
                  Për profesionistët
                </h2>
                <BenefitList
                  items={[
                    "Merr punë të reja çdo ditë",
                    "Ndërto profilin tënd profesional",
                    "Rrit të ardhurat",
                  ]}
                />
                <Link
                  href="/profesionistet"
                  className="mt-7 inline-block rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-all hover:bg-gold-dark hover:shadow-lift"
                >
                  Bëhu profesionist
                </Link>
              </div>
              <HexIllustration
                label="Profesionist me helmetë pune"
                icon={<HardHat size={56} strokeWidth={1.6} />}
              />
            </div>
          </div>

          {/* Central bee connecting both cards (desktop) */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
            <HexOutline size={92} stroke="#FFB800" fill="#FFFFFF" shadow>
              <Bee size={44} />
            </HexOutline>
          </div>
        </div>
      </div>
    </section>
  );
}
