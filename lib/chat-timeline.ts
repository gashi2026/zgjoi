/** Chat-then-hire: one private conversation per job. The quote cards and the job
 * status changes are shown inside that chat, in time order with the messages. */

export type JobStage = "pranuar" | "ne-progres" | "perfunduar";
export const jobStages: { key: JobStage; label: string }[] = [
  { key: "pranuar", label: "Pranuar" },
  { key: "ne-progres", label: "Në progres" },
  { key: "perfunduar", label: "Përfunduar" },
];

/** Where a job is on the hired → in progress → completed track. */
export function jobStatus(state: string): {
  reached: number; // index into jobStages, -1 before hiring
  cancelled: boolean;
  disputed: boolean;
} {
  const reached =
    state === "COMPLETED" ? 2 : state === "IN_PROGRESS" ? 1 : state === "BOOKED" ? 0 : state === "DISPUTED" ? 1 : -1;
  return { reached, cancelled: state === "CANCELLED", disputed: state === "DISPUTED" };
}

/** Status lines shown inside the chat, keyed by audit action. Only actions that
 * change the job for both sides appear; nothing here reveals who an admin is. */
const eventLabels: Record<string, { client: string; pro: string }> = {
  OFFER_ACCEPTED: { client: "Ju e punësuat profesionistin · Statusi: Pranuar", pro: "Klienti ju punësoi · Statusi: Pranuar" },
  PAYMENT_MARKED_PAID_OFFLINE: { client: "Pagesa u konfirmua nga Zgjoi", pro: "Pagesa u konfirmua nga Zgjoi · Mund të filloni punën" },
  PAYMENT_HELD: { client: "Pagesa u konfirmua", pro: "Pagesa u konfirmua · Mund të filloni punën" },
  START: { client: "Profesionisti filloi punën · Statusi: Në progres", pro: "Ju filluat punën · Statusi: Në progres" },
  REQUEST_COMPLETION: { client: "Profesionisti e shënoi punën të kryer · Konfirmoni përfundimin", pro: "Klientit iu kërkua të konfirmojë përfundimin" },
  CONFIRM_COMPLETION: { client: "Ju konfirmuat përfundimin · Statusi: Përfunduar", pro: "Klienti konfirmoi përfundimin · Statusi: Përfunduar" },
  CANCEL: { client: "Biseda u mbyll · Statusi: Anuluar", pro: "Biseda u mbyll · Statusi: Anuluar" },
  DISPUTE_OPENED: { client: "U hap një kontest · Administrata po e shqyrton", pro: "U hap një kontest · Administrata po e shqyrton" },
  RESCHEDULE_ACCEPTED: { client: "Orari i ri u pranua", pro: "Klienti pranoi orarin e ri" },
};
export function timelineEventLabel(action: string, pro: boolean) {
  const label = eventLabels[action];
  return label ? (pro ? label.pro : label.client) : null;
}
export const timelineActions = Object.keys(eventLabels);

type Dated = { id: string; createdAt: string };
/** Merge chat messages with timeline items (quote cards, status lines) by time.
 * Ties keep events before messages so a status line precedes replies to it. */
export function mergeTimeline<M extends Dated, E extends Dated>(messages: M[], events: E[]) {
  const rows: ({ kind: "message"; item: M } | { kind: "event"; item: E })[] = [
    ...events.map((item) => ({ kind: "event" as const, item })),
    ...messages.map((item) => ({ kind: "message" as const, item })),
  ];
  return rows.sort((a, b) => {
    const time = Date.parse(a.item.createdAt) - Date.parse(b.item.createdAt);
    if (time) return time;
    if (a.kind !== b.kind) return a.kind === "event" ? -1 : 1;
    return a.item.id.localeCompare(b.item.id);
  });
}
