import type { Metadata } from "next";
import AccountShell from "@/components/AccountShell";
import { DemoNote, Empty } from "@/components/account/Bits";
import ProCard from "@/components/ProCard";
import { clientNav } from "@/lib/nav";
import { clientSummary, favoriteIds } from "@/lib/account";
import { professionals } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Të preferuarit — Zgjoi" };

export default function FavouritesPage() {
  const saved = professionals.filter((p) => favoriteIds.includes(p.id));

  return (
    <AccountShell
      title="Të preferuarit"
      subtitle="Profesionistët që ke ruajtur për më vonë."
      nav={clientNav}
      user={{
        name: clientSummary.name,
        initials: clientSummary.initials,
        hue: clientSummary.hue,
        caption: `Klient · ${clientSummary.city}`,
      }}
    >
      {saved.length === 0 ? (
        <Empty
          title="Ende pa të preferuar"
          text="Kliko zemrën në profilin e një profesionisti dhe ai do të shfaqet këtu."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((p) => (
            <ProCard key={p.id} pro={p} />
          ))}
        </div>
      )}
      <DemoNote />
    </AccountShell>
  );
}
