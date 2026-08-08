import type { Metadata } from "next";
import AccountShell from "@/components/AccountShell";
import ReviewForm from "@/components/ReviewForm";
import { DemoNote } from "@/components/account/Bits";
import { clientNav } from "@/lib/nav";
import { clientSummary } from "@/lib/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Vlerëso punën — Zgjoi" };

export default function ReviewPage() {
  return (
    <AccountShell
      title="Vlerëso punën"
      subtitle="Vlerësimi yt konfirmon përfundimin dhe liron pagesën te profesionisti."
      nav={clientNav}
      user={{
        name: clientSummary.name,
        initials: clientSummary.initials,
        hue: clientSummary.hue,
        caption: `Klient · ${clientSummary.city}`,
      }}
    >
      <ReviewForm />
      <DemoNote />
    </AccountShell>
  );
}
