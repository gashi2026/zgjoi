import Link from "next/link";
import HowItWorks from "@/components/HowItWorks";
export const metadata = { title: "Për profesionistët | Zgjoi" };
export default function Page() {
  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold">
          Ndërtoni profilin tuaj profesional
        </h1>
        <p className="mt-5 text-lg text-muted">
          Klientët ju gjejnë në kërkim, shohin profilin dhe ju dërgojnë një
          kërkesë private. Ju diskutoni punën dhe dërgoni ofertën zyrtare.
        </p>
        <ul className="my-6 list-disc space-y-3 pl-5">
          <li>Plotësoni profilin, shërbimet, qytetet dhe orarin.</li>
          <li>Profili shqyrtohet para publikimit.</li>
          <li>Çdo ofertë ka çmim, përshkrim, kohë dhe afat pranimi.</li>
          <li>Prisni konfirmimin e pagesës para fillimit të punës.</li>
          <li>
            Klienti konfirmon përfundimin para transferimit të pagesës, minus
            komisionin e marrëveshjes.
          </li>
        </ul>
        <p className="mb-6 rounded-xl bg-honey p-4">
          Pagesat online janë ende në përgatitje. Regjistrimi dhe përgatitja e
          profilit nuk garantojnë punë ose të ardhura.
        </p>
        <Link
          href="/regjistrohu-profesionist"
          className="inline-block rounded-full bg-gold px-6 py-3 font-semibold"
        >
          Regjistrohu si profesionist
        </Link>
      </section>
      <HowItWorks />
    </div>
  );
}
