import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Faqja nuk u gjet</h1>
      <Link href="/kerko" className="mt-5 inline-block text-gold-dark">
        Gjej profesionistë →
      </Link>
    </div>
  );
}
