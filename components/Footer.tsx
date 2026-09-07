import Link from "next/link";
import { Logo } from "./Brand";
export default function Footer() {
  return (
    <footer className="border-t border-line bg-cream pb-24 pt-10 lg:pb-8">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-muted">
            Zgjoi lidh klientët në Kosovë me profesionistët përmes kërkesave
            private dhe ofertave të qarta.
          </p>
        </div>
        <nav aria-label="Shërbimet" className="flex flex-col gap-3 text-sm">
          <Link href="/kerko">Gjej profesionistë</Link>
          <Link href="/kategorite">Kategoritë</Link>
          <Link href="/profesionistet">Për profesionistët</Link>
          <Link href="/si-funksionon">Si funksionon</Link>
        </nav>
        <nav aria-label="Informacion" className="flex flex-col gap-3 text-sm">
          <Link href="/rreth-nesh">Rreth nesh</Link>
          <Link href="/kushtet">Kushtet e testimit</Link>
          <Link href="/privatesia">Privatësia</Link>
          <Link href="/hyr">Llogaria ime</Link>
          <p className="text-muted">Për ndihmë, hapni bisedën e mbështetjes.</p>
        </nav>
      </div>
    </footer>
  );
}
