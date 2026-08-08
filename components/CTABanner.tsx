import Link from "next/link";
import { Bee, FlightPath } from "./Brand";

export default function CTABanner() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-honey px-7 py-10 sm:px-12 sm:py-14">
          {/* subtle honeycomb pattern */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="hexpat"
                width="56"
                height="64"
                patternUnits="userSpaceOnUse"
                patternTransform="translate(0,0)"
              >
                <path
                  d="M28 2 L52 16 L52 46 L28 60 L4 46 L4 16 Z"
                  fill="none"
                  stroke="#FFB800"
                  strokeWidth="1"
                  opacity="0.4"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexpat)" />
          </svg>

          <div className="relative z-10 flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div className="max-w-md">
              <h2 className="text-3xl font-extrabold tracking-tight text-ink">
                Gati për të filluar?
              </h2>
              <p className="mt-3 text-base text-ink/70">
                Bashkohu me mijëra klientë dhe profesionistë në Zgjoi.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative hidden sm:block">
                <FlightPath className="absolute -left-28 -top-4 rotate-180" />
                <Bee size={54} className="animate-bee-hover" />
              </div>
              <Link
                href="/regjistrohu"
                className="rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-black hover:shadow-lift"
              >
                Regjistrohu falas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
