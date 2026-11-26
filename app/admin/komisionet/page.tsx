import { pageGuard } from "@/lib/server/guard";
import Frame, { Panel } from "@/components/marketplace/Frame";
import { serviceCategories } from "@/lib/service-categories";
import { categoryCommissionRates } from "@/lib/commission-policy";

export default async function CommissionPage() {
  const actor = await pageGuard("ADMIN");
  return <Frame actor={actor} title="Komisionet sipas kategorisë">
    <Panel>
      <p className="mb-4">Norma ruhet kur klienti pranon ofertën. Komisioni zbritet nga çmimi i ofertës; nuk shtohet si tarifë tjetër për klientin.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Normat e komisionit për 14 kategoritë e Zgjoi</caption>
        <thead><tr><th className="p-3">Kategoria</th><th className="p-3">Standard</th><th className="p-3">Elite</th><th className="p-3">E përsëritur</th></tr></thead>
        <tbody>{serviceCategories.map(c => <tr className="border-t border-line" key={c.slug}>
          <th scope="row" className="p-3 font-medium">{c.name}</th>
          <td className="p-3">{categoryCommissionRates[c.slug].standard / 100}%</td>
          <td className="p-3">{categoryCommissionRates[c.slug].elite / 100}%</td>
          <td className="p-3">{categoryCommissionRates[c.slug].recurring / 100}%</td>
        </tr>)}</tbody>
      </table></div>
    </Panel>
    <Panel><h2 className="mb-3 font-bold">Kualifikimi</h2>
      <p>Elite: 5% e profesionistëve me vëllimin më të lartë të punëve të përfunduara dhe të paguara në kategorinë e tyre gjatë muajit të kaluar, sipas orës së Kosovës. Numri rrumbullakohet lart; barazimet zgjidhen sipas identifikuesit të qëndrueshëm të profilit. Pa fitime të kualifikuara nuk jepet zbritje.</p>
      <p className="mt-3">Vizitat e përsëritura: 5% ka përparësi ndaj 10%. Kërkohet lidhja me një punë të përfunduar e të paguar të të njëjtit klient dhe profesionist, me orar javor, dyjavor ose mujor. Çdo vizitë ka ofertë, pranim dhe pagesë të veçantë.</p>
      <p className="mt-3">Pagesat janë ende në provë. Të dhënat e pagesave të provës nuk përdoren për çmime Elite në një mjedis me para reale. Pagesat dhe normat historike nuk rillogariten.</p>
    </Panel>
  </Frame>;
}
