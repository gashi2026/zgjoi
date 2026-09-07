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
      <h2 className="text-lg font-bold">Siguria e stafit</h2>
      <p className="mt-3">{health.staffMfa.enabled} nga {health.staffMfa.total} llogari aktive të stafit kanë autentikim me dy hapa.</p>
      {health.staffMfa.enabled < health.staffMfa.total && <p className="mt-2 text-sm text-amber-900">Çdo administrator dhe pjesëtar i mbështetjes duhet ta aktivizojë para hapjes së beta-s.</p>}
      {health.staffMfa.errors > 0 && <p className="mt-2 text-sm text-red-800">{health.staffMfa.errors} konfigurime kërkojnë kontroll teknik.</p>}
      <a className="mt-3 inline-block underline" href="/siguria">Konfiguroni sigurinë e llogarisë suaj</a>
    </Panel>
    <Panel>
      <h2 className="text-lg font-bold">Kontrolli periodik</h2>
      <p className={`mt-3 font-semibold ${health.maintenance === "RECENT" ? "text-green-800" : "text-amber-900"}`}>{maintenance}</p>
      {health.maintenance !== "RECENT" && <p className="mt-2 text-sm">Kërkoni kontrollin e ekzekutimit periodik para se të mbështeteni te skadimi automatik i ofertave ose dërgimi i email-eve.</p>}
      {health.environment === "PREVIEW" && <p className="mt-2 text-sm text-muted">Mjedis prove. Ekzekutimi automatik në këtë mjedis kërkon verifikim më vete.</p>}
    </Panel>
    <Panel>
      <h2 className="text-lg font-bold">Emaili i llogarisë</h2>
      <p className="mt-3">{health.emailConfigured ? "Konfiguruar; dorëzimi duhet provuar." : "Kërkon aktivizim dhe provë të dorëzimit."}</p>
      <p className="mt-2 text-sm">Email-et opsionale për punët: {health.jobEmailEnabled ? "aktive vetëm për përdoruesit që i zgjedhin" : "ende jo aktive"}.</p>
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
