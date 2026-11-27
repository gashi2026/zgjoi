import Link from "next/link";
import { ID_RETENTION_DAYS_AFTER_APPROVAL, ID_RETENTION_DAYS_AFTER_DECLINE } from "@/lib/id-verification";
export default function PrivacyNote() {
  return (
    <aside aria-label="Shënim privatësie" className="rounded-2xl border border-line bg-[#FFFDF5] p-4 text-sm leading-relaxed">
      <p className="mb-1 font-bold">🔒 Shënim privatësie</p>
      <p>
        Fotot e dokumentit përdoren vetëm për të verifikuar identitetin tuaj, në përputhje me Ligjin Nr. 06/L-082 për
        Mbrojtjen e të Dhënave Personale të Republikës së Kosovës. Ruhen të enkriptuara, nuk janë kurrë publike dhe i sheh
        vetëm administratori i Zgjoi. Fshihen automatikisht {ID_RETENTION_DAYS_AFTER_APPROVAL} ditë pas miratimit ose {ID_RETENTION_DAYS_AFTER_DECLINE} ditë
        pas refuzimit; më pas ruhet vetëm vendimi dhe data e tij. Mund të kërkoni qasje ose fshirje përmes mbështetjes, dhe
        keni të drejtë ankese te Agjencia për Informim dhe Privatësi. <Link href="/privatesia" className="font-semibold text-gold-dark underline">Politika e privatësisë</Link>
      </p>
    </aside>
  );
}
