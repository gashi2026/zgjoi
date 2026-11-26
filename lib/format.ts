import { KOSOVO_TIME_ZONE } from "./scheduling";
export const money = (cents: number) =>
  new Intl.NumberFormat("sq-XK", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
// hourCycle h23: always 24-hour times such as 16:45 (never "04:45 m.d.").
export const dateTime = (value: Date | string) =>
  new Intl.DateTimeFormat("sq-XK", {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
    timeZone: KOSOVO_TIME_ZONE,
  }).format(new Date(value));
/** Kosovo wall-clock time, 24-hour: "16:45". */
export const clockTime = (value: Date | string) =>
  new Intl.DateTimeFormat("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: KOSOVO_TIME_ZONE,
  }).format(new Date(value));
export const unreadMessagesLabel = (count: number) =>
  count === 1 ? "1 mesazh i palexuar" : `${count} mesazhe të palexuara`;
export const unreadNotificationsLabel = (count: number) =>
  count === 1 ? "1 njoftim i palexuar" : `${count} njoftime të palexuara`;
export const stateLabel = (state: string) =>
  ({
    OPEN: "Në pritje të ofertës",
    QUOTED: "Oferta u dërgua",
    BOOKED: "Oferta u pranua",
    IN_PROGRESS: "Në punë",
    COMPLETED: "Përfunduar",
    CANCELLED: "Anuluar",
    DISPUTED: "Në shqyrtim",
    SENT: "Dërguar",
    ACCEPTED: "Pranuar",
    DECLINED: "Refuzuar",
    WITHDRAWN: "Tërhequr",
    EXPIRED: "Skaduar",
    PENDING: "Në pritje",
    HELD: "Pagesa u konfirmua",
    RELEASED: "Transferuar te profesionisti",
    REFUND_PENDING: "Rimbursimi po përpunohet",
    REFUNDED: "Rimbursuar",
    SCHEDULED: "Në pritje të transferimit",
    TRANSFERRED: "Transferuar në llogarinë e pagesave",
    PAID: "Paguar në bankë",
    PROCESSING: "Duke u përpunuar",
    FAILED: "Dështuar",
    APPROVED: "Miratuar",
    REJECTED: "Kërkon rishikim",
  })[state] ?? state;
