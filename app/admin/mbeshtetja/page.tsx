import type { Metadata } from "next";
import { Clock } from "lucide-react";
import AccountShell from "@/components/AccountShell";
import { Card, StatCard, SectionTitle } from "@/components/account/Bits";
import SupportInbox from "@/components/SupportInbox";
import { adminNav } from "@/lib/nav";
import { supportStatus, SUPPORT_HOURS_LABEL } from "@/lib/support-hours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mbështetja — Admin Zgjoi" };

const admin = { name: "Rrustem Gashi", initials: "RG", hue: 38, caption: "Administrator" };

export default async function SupportAdminPage() {
  const status = supportStatus();

  return (
    <AccountShell
      title="Mbështetja e drejtpërdrejtë"
      subtitle={SUPPORT_HOURS_LABEL}
      nav={adminNav}
      user={admin}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Statusi"
          value={status.online ? "Online" : "Jashtë orarit"}
          hint={status.nextOpenLabel}
        />
        <StatCard label="Ora në Kosovë" value={status.localTime} hint="Europe/Belgrade" />
        <StatCard label="Orari" value="09:00–17:00" hint="E hënë – e premte" />
      </div>

      <Card className="mt-6 flex items-start gap-3">
        <Clock size={18} className="mt-0.5 shrink-0 text-gold-dark" />
        <p className="text-sm leading-relaxed text-muted">
          Mesazhet që vijnë jashtë orarit shënohen si <b className="text-ink">offline</b>{" "}
          dhe klienti merr menjëherë një përgjigje automatike që e njofton se
          kur kthehemi. Ato shfaqen të parat në radhë.
        </p>
      </Card>

      <div className="mt-8">
        <SectionTitle>Bisedat</SectionTitle>
        <SupportInbox />
      </div>
    </AccountShell>
  );
}
