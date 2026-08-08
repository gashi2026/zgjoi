import type { Metadata } from "next";
import AccountShell from "@/components/AccountShell";
import QuoteBuilder from "@/components/QuoteBuilder";
import { DemoNote } from "@/components/account/Bits";
import { proNav } from "@/lib/nav";
import { proSummary } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ndërto ofertën — Zgjoi për profesionistë" };

export default function QuoteBuilderPage() {
  return (
    <AccountShell
      title="Ndërto ofertën"
      subtitle="Zbërthe çmimin në zëra që klienti të kuptojë saktësisht për çfarë paguan."
      nav={proNav}
      user={{
        name: proSummary.name,
        initials: proSummary.initials,
        hue: proSummary.hue,
        caption: `${proSummary.profession} · ${proSummary.city}`,
      }}
    >
      <QuoteBuilder />
      <DemoNote />
    </AccountShell>
  );
}
