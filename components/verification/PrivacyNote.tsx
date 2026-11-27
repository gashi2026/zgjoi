import Link from "next/link";
import { ID_RETENTION_DAYS_AFTER_DECLINE } from "@/lib/id-verification";
export default function PrivacyNote() {
  return (
    <aside aria-label="Shënim privatësie" className="rounded-2xl border border-line bg-[#FFFDF5] p-4 text-sm leading-relaxed">
      <p className="mb-1 font-bold">🔒 Shënim privatësie</p>
      <p>
        Fotot e dokumentit përdoren vetëm për të verifikuar identitetin tuaj, në përputhje me Ligjin Nr. 06/L-082 për
        Mbrojtjen e të Dhënave Personale të Republikës së Kosovës. Ruhen të enkriptuara, nuk janë kurrë publike dhe i sheh
        vetëm administratori i Zgjoi (ose një anëtar i stafit të cilit administratori i ka dhënë leje). Fotot fshihen
        automatikisht {ID_RETENTION_DAYS_AFTER_DECLINE} ditë pas vendimit (miratim ose refuzim).
      </p>
      <p className="mt-2">
        Pas miratimit ruajmë një regjistër identiteti për qëllime ligjore dhe sigurie: emrin ligjor, datën e lindjes, llojin,
        numrin, shtetin lëshues dhe skadimin e dokumentit, si dhe datën dhe vendimin e verifikimit. Data e lindjes dhe numri i
        dokumentit ruhen të enkriptuara. Ky regjistër nuk fshihet bashkë me fotot; ruhet për aq kohë sa e kërkon ligji dhe mund
        t’u jepet vetëm autoriteteve që e kërkojnë ligjërisht. Mund të kërkoni qasje përmes mbështetjes, dhe keni të drejtë
        ankese te Agjencia për Informim dhe Privatësi. <Link href="/privatesia" className="font-semibold text-gold-dark underline">Politika e privatësisë</Link>
      </p>
    </aside>
  );
}
