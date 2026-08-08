import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Marquee from "./Marquee";
import ProHex from "./ProHex";
import { professionals } from "@/lib/data";

const TILE = 190;

export default function RecommendedPros() {
  const order = [
    "arben-elektricist",
    "besnik-hidraulik",
    "valon-pastrim",
    "luan-piktor",
  ];
  const featured = [
    ...order
      .map((id) => professionals.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    ...professionals.filter((p) => !order.includes(p.id)),
  ];

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Profesionistë të rekomanduar
          </h2>
          <Link
            href="/kerko"
            className="group flex items-center gap-1 text-sm font-semibold text-gold-dark"
          >
            Shiko të gjithë
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>

      {/* belt runs the other way to the categories row */}
      <div className="mt-6 pb-14">
        <Marquee speed={30} direction="right" gap={0} className="py-6">
          {featured.map((pro) => (
            <ProHex key={pro.id} pro={pro} width={TILE} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
