import type { Metadata } from "next";
import AccountShell from "@/components/AccountShell";
import LeadBudget from "@/components/LeadBudget";
import { DemoNote } from "@/components/account/Bits";
import { proNav } from "@/lib/nav";
import { proSummary } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buxheti i lead-eve — Zgjoi për profesionistë",
};

export default function LeadBudgetPage() {
  return (
    <AccountShell
      title="Buxheti i lead-eve"
      subtitle="Vendos sa shpenzon në javë për kërkesa të reja dhe ku dëshiron të punosh."
      nav={proNav}
      user={{
        name: proSummary.name,
        initials: proSummary.initials,
        hue: proSummary.hue,
        caption: `${proSummary.profession} · ${proSummary.city}`,
      }}
    >
      <LeadBudget />
      <DemoNote />
    </AccountShell>
  );
}
