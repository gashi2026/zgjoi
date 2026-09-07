import { ShieldCheck, Star, BadgeEuro, Headphones } from "lucide-react";
import { HexOutline } from "./Brand";

const features = [
  {
    icon: ShieldCheck,
    title: "Profile të shqyrtuara",
    text: "Profilet profesionale shqyrtohen para se të shfaqen në kërkim.",
  },
  {
    icon: Star,
    title: "Vlerësime dhe komente reale",
    text: "Vetëm klientët që kanë përfunduar një punë mund të lënë vlerësim.",
  },
  {
    icon: BadgeEuro,
    title: "Çmime të qarta dhe të ndershme",
    text: "Oferta e profesionistit përfshin çmimin, përshkrimin, orarin dhe afatin e pranimit.",
  },
  {
    icon: Headphones,
    title: "Siguri dhe mbështetje",
    text: "Përdorni bisedën e mbështetjes për pyetje dhe probleme me kërkesën tuaj.",
  },
];

export default function WhyZgjoi() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Pse Zgjoi?
        </h2>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <HexOutline
                size={78}
                stroke="#FFB800"
                strokeWidth={2.5}
                fill="#FFFCF5"
              >
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
  );
}
