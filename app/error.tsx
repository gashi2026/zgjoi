"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
      <h1 className="text-2xl font-bold">Faqja nuk u ngarkua</h1>
      <p className="text-muted">
        Shërbimi nuk është i disponueshëm për momentin. Provoni përsëri; nëse
        problemi vazhdon, përdorni mbështetjen.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-gold px-5 py-3 font-semibold"
      >
        Provo përsëri
      </button>
    </div>
  );
}
