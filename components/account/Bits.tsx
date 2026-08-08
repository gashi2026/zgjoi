import type { Status } from "@/lib/account";
import { statusLabel, statusStyle } from "@/lib/account";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-lg font-extrabold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Badge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${statusStyle[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{text}</p>
    </div>
  );
}

export function DemoNote() {
  return (
    <p className="mt-8 rounded-xl border border-dashed border-line bg-white px-4 py-3 text-xs text-muted">
      Kjo faqe është demonstrim: të dhënat janë shembuj dhe nuk ruhen askund
      derisa të lidhet backend-i.
    </p>
  );
}
