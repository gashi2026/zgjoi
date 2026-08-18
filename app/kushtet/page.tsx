import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kushtet e përdorimit — Zgjoi",
  description:
    "Kushtet e përdorimit të platformës Zgjoi: si funksionojnë pagesat, komisioni, anulimet dhe përgjegjësitë e palëve.",
};

const UPDATED = "18 gusht 2026";

function H2({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-24 text-xl font-extrabold text-ink sm:text-2xl">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15px] leading-relaxed text-muted">{children}</p>;
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[15px] leading-relaxed text-muted">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
      <span>{children}</span>
    </li>
  );
}

export default function TermsPage() {
  return (
    <main className="bg-cream">
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <p className="text-sm font-bold uppercase tracking-wide text-gold-dark">Dokument ligjor</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
          Kushtet e përdorimit
        </h1>
        <p className="mt-3 text-sm text-muted">Përditësuar më {UPDATED}</p>

        <div className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
          <p className="text-[15px] leading-relaxed text-ink">
            Këto kushte rregullojnë përdorimin e platformës <b>Zgjoi</b>. Duke krijuar
            llogari ose duke përdorur shërbimet tona, ju pranoni këto kushte në tërësi.
          </p>
        </div>

        <H2 id="perkufizime">1. Përkufizime</H2>
        <ul className="mt-3 space-y-2">
          <LI><b>Zgjoi</b> — platforma online që lidh klientët me profesionistë shërbimesh në Kosovë.</LI>
          <LI><b>Klient</b> — personi që kërkon dhe porosit një shërbim përmes platformës.</LI>
          <LI><b>Profesionist</b> — personi ose biznesi që ofron shërbimin dhe e kryen punën.</LI>
          <LI><b>Punë</b> — shërbimi konkret i rënë dakord mes klientit dhe profesionistit.</LI>
          <LI><b>Llogaria e Zgjoi</b> — llogaria bankare e Zgjoi në TEB Bank Kosovë, ku mbahen pagesat deri në përfundimin e punës.</LI>
        </ul>

        <H2 id="roli">2. Roli i Zgjoi</H2>
        <P>
          Zgjoi është ndërmjetës teknologjik. Kontrata për kryerjen e punës lidhet
          drejtpërdrejt mes klientit dhe profesionistit. Zgjoi nuk e kryen vetë
          shërbimin, nuk e punëson profesionistin dhe nuk është palë në atë kontratë.
        </P>
        <P>
          Zgjoi kujdeset për: prezantimin e profesionistëve, shkëmbimin e ofertave,
          komunikimin, mbajtjen e përkohshme të pagesës dhe mbështetjen e përdoruesve.
        </P>

        <H2 id="pagesat">3. Si funksionojnë pagesat</H2>
        <P>
          Të gjitha pagesat kryhen me transfer bankar në llogarinë e Zgjoi në TEB Bank.
          Zgjoi nuk pranon pagesa me kartë dhe nuk ruan të dhëna karte.
        </P>
        <ol className="mt-4 space-y-3">
          {[
            ["Pranimi i ofertës", "Klienti zgjedh ofertën e profesionistit dhe merr udhëzimet e pagesës me një numër unik referencë."],
            ["Transferi", "Klienti transferon shumën e plotë në llogarinë e Zgjoi në TEB, duke shënuar numrin e referencës."],
            ["Konfirmimi i arkëtimit", "Pas verifikimit të pasqyrës bankare, Zgjoi e shënon pagesën si të arkëtuar dhe profesionisti njoftohet se mund ta fillojë punën."],
            ["Mbajtja e mjeteve", "Shuma mbahet në llogarinë e Zgjoi gjatë gjithë kohës që puna është në vazhdim. Profesionisti nuk e merr paranë para përfundimit."],
            ["Konfirmimi i përfundimit", "Kur puna përfundon, klienti e konfirmon atë në platformë. Ky konfirmim gjeneron detyrimin e pagesës ndaj profesionistit."],
            ["Pagesa e profesionistit", "Zgjoi transferon nga llogaria e vet shumën e punës minus komisionin, brenda afatit të përcaktuar më poshtë."],
          ].map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-honey text-sm font-extrabold text-gold-dark">
                {i + 1}
              </span>
              <span className="text-[15px] leading-relaxed text-muted">
                <b className="text-ink">{title}.</b> {text}
              </span>
            </li>
          ))}
        </ol>

        <H2 id="komisioni">4. Komisioni</H2>
        <P>
          Zgjoi mban një komision prej <b className="text-ink">15%</b> të vlerës së punës.
          Komisioni mbahet automatikisht nga shuma e arkëtuar dhe nuk faturohet veçmas.
          Çmimi që sheh klienti në ofertë është çmimi përfundimtar — komisioni nuk i shtohet
          mbi të.
        </P>
        <P>
          Shembull: për një punë prej 100€, klienti transferon 100€ në llogarinë e Zgjoi,
          profesionisti merr 85€ dhe Zgjoi mban 15€.
        </P>

        <H2 id="afatet">5. Afatet e pagesës</H2>
        <ul className="mt-3 space-y-2">
          <LI>Pagesa e profesionistit kryhet brenda <b>5 ditëve pune</b> nga konfirmimi i përfundimit të punës nga klienti.</LI>
          <LI>Nëse klienti nuk e konfirmon dhe as nuk e konteston punën brenda <b>7 ditëve</b> nga data e njoftuar e përfundimit, puna konsiderohet e pranuar dhe pagesa lirohet.</LI>
          <LI>Pagesat kryhen vetëm në llogari bankare në emër të profesionistit ose biznesit të tij të regjistruar.</LI>
          <LI>Transferet kryhen në ditë pune; festat zyrtare dhe afatet e bankës mund t&apos;i zgjasin ato.</LI>
        </ul>

        <H2 id="anulimi">6. Anulimet dhe rimbursimet</H2>
        <ul className="mt-3 space-y-2">
          <LI>Nëse puna anulohet para se të fillojë, shuma i kthehet klientit e plotë.</LI>
          <LI>Nëse puna anulohet pasi ka filluar, palët bien dakord për pjesën e kryer; nëse nuk pajtohen, zbatohet procedura e kontestit.</LI>
          <LI>Rimbursimet kryhen në të njëjtën llogari nga e cila është kryer pagesa, brenda <b>10 ditëve pune</b>.</LI>
          <LI>Komisioni nuk mbahet për punët e anuluara që rimbursohen plotësisht.</LI>
        </ul>

        <H2 id="kontestet">7. Kontestet</H2>
        <P>
          Nëse klienti nuk është i kënaqur, ai duhet ta hapë kontestin në platformë
          brenda <b>7 ditëve</b> nga përfundimi i punës. Gjatë shqyrtimit, mjetet
          mbeten të mbajtura në llogarinë e Zgjoi dhe nuk paguhen te asnjëra palë.
        </P>
        <P>
          Zgjoi shqyrton provat e të dyja palëve (mesazhet, fotot, ofertën e pranuar) dhe
          merr një vendim brenda <b>10 ditëve pune</b>: pagesë e plotë, pagesë e pjesshme
          ose rimbursim. Vendimi i Zgjoi është administrativ dhe nuk e kufizon të drejtën
          e palëve t&apos;i drejtohen organeve kompetente.
        </P>

        <H2 id="detyrimet-profesionist">8. Detyrimet e profesionistit</H2>
        <ul className="mt-3 space-y-2">
          <LI>Të japë të dhëna të sakta për identitetin, kualifikimet dhe llogarinë bankare.</LI>
          <LI>Ta kryejë punën sipas ofertës së pranuar, në afat dhe me cilësi profesionale.</LI>
          <LI>Të mbajë vetë përgjegjësi për taksat, kontributet dhe detyrimet e tij ligjore ndaj autoriteteve të Kosovës.</LI>
          <LI>Të mos kërkojë pagesë jashtë platformës për punë të nisura përmes Zgjoi.</LI>
          <LI>Të mbulojë dëmet e shkaktuara nga neglizhenca e tij gjatë punës.</LI>
        </ul>

        <H2 id="detyrimet-klient">9. Detyrimet e klientit</H2>
        <ul className="mt-3 space-y-2">
          <LI>Të përshkruajë saktë punën e kërkuar dhe kushtet e vendit ku do të kryhet.</LI>
          <LI>Ta transferojë shumën e rënë dakord me referencën e saktë.</LI>
          <LI>T&apos;i mundësojë profesionistit qasje të arsyeshme për ta kryer punën.</LI>
          <LI>Ta konfirmojë ose kontestojë punën brenda afatit.</LI>
        </ul>

        <H2 id="pergjegjesia">10. Kufizimi i përgjegjësisë</H2>
        <P>
          Zgjoi nuk garanton cilësinë e punës së kryer nga profesionistët dhe nuk mban
          përgjegjësi për dëme që rrjedhin nga kryerja e shërbimit. Përgjegjësia e Zgjoi,
          në çdo rast, kufizohet në shumën e komisionit të mbajtur për atë punë konkrete.
        </P>
        <P>
          Verifikimi i profesionistëve nënkupton kontroll bazë të dokumenteve të paraqitura
          dhe nuk përbën garanci për aftësitë profesionale.
        </P>

        <H2 id="llogaria">11. Llogaritë dhe pezullimi</H2>
        <P>
          Zgjoi mund ta pezullojë ose mbyllë një llogari në rast të shkeljes së këtyre
          kushteve, të dhënave të rreme, mashtrimit ose sjelljes abuzive. Mjetet e mbajtura
          për punë të përfunduara në mirëbesim paguhen edhe pas pezullimit.
        </P>

        <H2 id="te-dhenat">12. Të dhënat personale</H2>
        <P>
          Zgjoi përpunon të dhëna personale sipas Ligjit për Mbrojtjen e të Dhënave
          Personale të Republikës së Kosovës. Numri personal i profesionistëve ruhet i
          enkriptuar dhe përdoret vetëm për verifikim. Të dhënat bankare përdoren vetëm
          për kryerjen e pagesave.
        </P>

        <H2 id="ndryshimet">13. Ndryshimet</H2>
        <P>
          Zgjoi mund t&apos;i përditësojë këto kushte. Ndryshimet publikohen në këtë faqe
          dhe hyjnë në fuqi 15 ditë pas publikimit. Përdorimi i vazhdueshëm i platformës
          pas kësaj date nënkupton pranimin e tyre.
        </P>

        <H2 id="ligji">14. Ligji i zbatueshëm</H2>
        <P>
          Këto kushte rregullohen nga legjislacioni i Republikës së Kosovës. Për
          mosmarrëveshjet që nuk zgjidhen me mirëkuptim, kompetente janë gjykatat e Kosovës.
        </P>

        <H2 id="kontakt">15. Kontakti</H2>
        <P>
          Për çdo pyetje rreth këtyre kushteve, na shkruani përmes faqes{" "}
          <Link href="/rreth-nesh" className="font-semibold text-gold-dark hover:underline">
            Rreth nesh
          </Link>{" "}
          ose përmes bisedës së mbështetjes në faqe.
        </P>

        <div className="mt-12 rounded-2xl border border-line bg-white p-5 text-sm leading-relaxed text-muted shadow-soft">
          Ky dokument është përgatitur për nevojat e platformës dhe nuk zëvendëson
          këshillën juridike. Para nisjes së pagesave reale, rekomandohet shqyrtimi nga
          një avokat i licencuar në Kosovë.
        </div>
      </section>
    </main>
  );
}
