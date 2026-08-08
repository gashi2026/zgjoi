import type { Metadata } from "next";
import AccountShell from "@/components/AccountShell";
import ChatView from "@/components/ChatView";
import { DemoNote } from "@/components/account/Bits";
import { clientNav } from "@/lib/nav";
import { clientSummary } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mesazhet — Zgjoi" };

export default function MessagesPage() {
  return (
    <AccountShell
      title="Mesazhet"
      subtitle="Bisedat me profesionistët për kërkesat e tua."
      nav={clientNav}
      user={{
        name: clientSummary.name,
        initials: clientSummary.initials,
        hue: clientSummary.hue,
        caption: `Klient · ${clientSummary.city}`,
      }}
    >
      <ChatView backHref="/llogaria" />
      <DemoNote />
    </AccountShell>
  );
}
