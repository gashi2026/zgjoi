import type { Metadata } from "next";
import AccountShell from "@/components/AccountShell";
import ChatView from "@/components/ChatView";
import { DemoNote } from "@/components/account/Bits";
import { proNav } from "@/lib/nav";
import { proSummary } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mesazhet — Zgjoi për profesionistë" };

export default function ProMessagesPage() {
  return (
    <AccountShell
      title="Mesazhet"
      subtitle="Bisedat me klientët, të renditura sipas punëve aktive."
      nav={proNav}
      user={{
        name: proSummary.name,
        initials: proSummary.initials,
        hue: proSummary.hue,
        caption: `${proSummary.profession} · ${proSummary.city}`,
      }}
    >
      <ChatView backHref="/pro/paneli" />
      <DemoNote />
    </AccountShell>
  );
}
