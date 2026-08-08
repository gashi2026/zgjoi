import type { Metadata } from "next";
import AccountShell from "@/components/AccountShell";
import CheckoutForm from "@/components/CheckoutForm";
import { DemoNote } from "@/components/account/Bits";
import { clientNav } from "@/lib/nav";
import { clientSummary } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pagesa — Zgjoi" };

export default function CheckoutPage() {
  return (
    <AccountShell
      title="Pagesa"
      subtitle="Pagesa bllokohet te Zgjoi dhe lirohet vetëm pas përfundimit të punës."
      nav={clientNav}
      user={{
        name: clientSummary.name,
        initials: clientSummary.initials,
        hue: clientSummary.hue,
        caption: `Klient · ${clientSummary.city}`,
      }}
    >
      <CheckoutForm />
      <DemoNote />
    </AccountShell>
  );
}
