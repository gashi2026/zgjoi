import Link from "next/link";
import { pageGuard } from "@/lib/server/guard";
import { db } from "@/lib/server/db";
import { dateTime } from "@/lib/format";
import Frame, { Panel } from "@/components/marketplace/Frame";
import Thread from "@/components/marketplace/Thread";
import ApiForm from "@/components/marketplace/ApiForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; page?: string }>;
}) {
  const actor = await pageGuard("ADMIN", "SUPPORT");
  const params = await searchParams,
    page = Math.min(
      1000,
      Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1),
    );
  const tickets = await db.supportTicket.findMany({
    orderBy: { updatedAt: "desc" },
    take: 30,
    skip: (page - 1) * 30,
    select: { id: true, subject: true, state: true, updatedAt: true },
  });
  const selected = params.ticket
    ? await db.supportTicket.findUnique({
        where: { id: params.ticket.slice(0, 100) },
        select: { id: true, subject: true, state: true },
      })
    : null;
  return (
    <Frame actor={actor} title="Mbështetja">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-bold">Bisedat</h2>
          {!tickets.length && <p>Nuk ka biseda ende.</p>}
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`?ticket=${t.id}&page=${page}`}
              className="block border-b border-line py-4"
            >
              <p className="font-semibold">{t.subject}</p>
              <p className="text-xs text-muted">
                {t.state} · {dateTime(t.updatedAt)}
              </p>
            </Link>
          ))}
          <nav className="mt-3 flex gap-4">
            {page > 1 && <Link href={`?page=${page - 1}`}>← Më parë</Link>}
            {tickets.length === 30 && (
              <Link href={`?page=${page + 1}`}>Tjetër →</Link>
            )}
          </nav>
        </Panel>
        {selected && (
          <Panel>
            <h2 className="mb-4 font-bold">{selected.subject}</h2>
            <Thread key={selected.id} id={selected.id} support staff />
            <div className="mt-4">
              <ApiForm
                endpoint="/api/support/state"
                values={{
                  ticketId: selected.id,
                  state: selected.state === "RESOLVED" ? "OPEN" : "RESOLVED",
                }}
                label={
                  selected.state === "RESOLVED"
                    ? "Rihap bisedën"
                    : "Shëno si të zgjidhur"
                }
              />
            </div>
          </Panel>
        )}
      </div>
    </Frame>
  );
}
