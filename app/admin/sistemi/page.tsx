import { pageGuard } from "@/lib/server/guard";
import { operationalHealth } from "@/lib/server/operations";
import { dateTime } from "@/lib/format";
import Frame, { Panel } from "@/components/marketplace/Frame";
export default async function Page() {
  const actor = await pageGuard("ADMIN");
  const health = await operationalHealth();
  const maintenance = { UNKNOWN: "Pa ekzekutim të verifikuar", LATE: "Kontrolli periodik është vonuar", RECENT: "Ekzekutim në 15 minutat e fundit" }[health.maintenance];
  return <Frame actor={actor} title="Gjendja e shërbimeve" subtitle={`Kontrolluar: ${dateTime(health.checkedAt)} · ora e Kosovës`}>
    <Panel>
      <h2 className="text-lg font-bold">Kontrolli periodik</h2>
      <p className={`mt-3 font-semibold ${health.maintenance === "RECENT" ? "text-green-800" : "text-amber-900"}`}>{maintenance}</p>
      {health.maintenance !== "RECENT" && <p className="mt-2 text-sm">Kërkoni kontrollin e ekzekutimit periodik para se të mbështeteni te skadimi automatik i ofertave ose dërgimi i email-eve.</p>}
      {health.environment === "PREVIEW" && <p className="mt-2 text-sm text-muted">Mjedis prove. Ekzekutimi automatik në këtë mjedis kërkon verifikim më vete.</p>}
    </Panel>
    <Panel>
      <h2 className="text-lg font-bold">Emaili i llogarisë</h2>
      <p className="mt-3">{health.emailConfigured ? "Konfiguruar; dorëzimi duhet provuar." : "Kërkon aktivizim dhe provë të dorëzimit."}</p>
      <ul className="mt-3 space-y-2 text-sm">
        <li>{health.mail.failed} dërgesa të dështuara që kërkojnë shqyrtim.</li>
        <li>{health.mail.overdue} dërgesa kanë kaluar kohën e provës së radhës me mbi 15 minuta.</li>
        <li>{health.mail.processingExpired} dërgesa kanë mbetur në përpunim mbi 5 minuta.</li>
      </ul>
      <p className="mt-3 text-sm text-muted">Për një lidhje verifikimi ose rikuperimi të skaduar, përdoruesi duhet të kërkojë lidhje të re.</p>
    </Panel>
    <Panel>
      <h2 className="text-lg font-bold">Dokumentet private</h2>
      <p className="mt-3">{health.documentsConfigured ? "Konfiguruar; qasja private dhe dorëzimi duhet provuar." : "Ngarkimet kërkojnë konfigurim dhe provë private."}</p>
    </Panel>
  </Frame>;
}
