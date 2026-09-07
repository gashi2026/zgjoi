export const metadata = {
  title: "Kushtet e testimit | Zgjoi",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold">Përdorimi gjatë testimit</h1>
      <p className="rounded-xl bg-honey p-4">
        Zgjoi është në përgatitje. Pagesat reale dhe shërbimet financiare nuk
        janë aktive. Kushtet tregtare përfundimtare do të publikohen para
        lançimit me pagesa.
      </p>
      <section>
        <h2 className="text-xl font-bold">Kërkesat dhe ofertat</h2>
        <p className="mt-2">
          Kërkesa juaj i dërgohet vetëm profesionistit të zgjedhur. Oferta
          përfshin çmimin, përshkrimin, orarin dhe afatin e pranimit. Mos
          filloni një punë të paguar duke u mbështetur në një status prove.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-bold">Të dhënat dhe sjellja</h2>
        <p className="mt-2">
          Përdorni të dhëna të sakta. Mos dërgoni përmbajtje të paligjshme,
          fjalëkalime ose të dhëna karte në biseda. Llogaritë që abuzojnë me
          shërbimin mund të pezullohen pas shqyrtimit.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-bold">Përfundimi dhe vlerësimi</h2>
        <p className="mt-2">
          Vetëm klienti konfirmon përfundimin. Vlerësimi është veprim i veçantë
          dhe opsional, pas përfundimit të konfirmuar. Për problem ose kërkesë
          për korrigjim, përdorni mbështetjen.
        </p>
      </section>
      <p className="text-sm text-muted">
        Ky njoftim përshkruan mjedisin e testimit. Nuk është marrëveshje për
        mbajtjen e fondeve ose për pagesa bankare.
      </p>
    </article>
  );
}
