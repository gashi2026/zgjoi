import { pageGuard } from "@/lib/server/guard";
import { accountSessions } from "@/lib/server/auth";
import { dateTime } from "@/lib/format";
import Frame, { Panel } from "@/components/marketplace/Frame";
import ApiForm from "@/components/marketplace/ApiForm";
import MfaPanel from "@/components/marketplace/MfaPanel";
import { mfaStatus } from "@/lib/server/mfa";
import { notificationPreferences } from "@/lib/server/notification-preferences";
import { db } from "@/lib/server/db";
export const metadata = { title: "Siguria e llogarisë — Zgjoi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await pageGuard();
  const [sessions, mfa, preferences] = await Promise.all([accountSessions(actor), mfaStatus(actor), notificationPreferences(db, actor.id)]);
  return <Frame actor={actor} title="Siguria e llogarisë">
    <Panel><MfaPanel {...mfa} staff={actor.role === "ADMIN" || actor.role === "SUPPORT"} /></Panel>
    <Panel>
      <h2 className="mb-3 text-lg font-bold">Njoftimet me email</h2>
      <p className="mb-4 text-sm text-muted">Njoftimet në llogari mbeten gjithmonë aktive. Email-et opsionale për kërkesa, mesazhe dhe oferta kërkojnë adresë të verifikuar. Mesazhet private nuk kopjohen në email.</p>
      {process.env.JOB_EMAILS_ENABLED !== "true" && <p className="mb-3 text-sm">Dërgimi i këtyre njoftimeve ende nuk është aktiv. Preferenca juaj mund të ruhet tani.</p>}
      <ApiForm endpoint="/api/account/notifications" label="Ruaj preferencat"
        fields={[{ name: "jobEmail", label: "Dua njoftime për punët me email", type: "checkbox", checked: preferences.jobEmail }]} />
    </Panel>
    <Panel>
      <h2 className="text-lg font-bold">Hyrjet aktive</h2>
      <p className="mt-2 text-sm text-muted">Shfaqen deri në 50 hyrjet më të fundit. Orët janë sipas Kosovës.</p>
      <ul className="mt-4 divide-y divide-line">
        {sessions.map((session, i) => <li key={i} className="py-3 text-sm">
          <p className="font-semibold">{session.current ? "Hyrja aktuale" : "Hyrje tjetër"}</p>
          <p>Filluar: {dateTime(session.createdAt)}</p>
          <p>Skadon: {dateTime(session.expiresAt)}</p>
        </li>)}
      </ul>
    </Panel>
    <Panel>
      <h2 className="mb-3 text-lg font-bold">Mbyll hyrjet e tjera</h2>
      <p className="mb-4 text-sm text-muted">Nëse keni harruar të dilni në një pajisje tjetër, mbyllni të gjitha hyrjet e tjera. Kjo hyrje mbetet aktive.</p>
      <ApiForm endpoint="/api/account/sessions" label="Mbyll hyrjet e tjera"
        confirmation="Dëshironi të mbyllni të gjitha hyrjet e tjera?"
        fields={[{ name: "currentPassword", label: "Fjalëkalimi aktual", type: "password", required: true, autoComplete: "current-password" }]} />
    </Panel>
  </Frame>;
}
