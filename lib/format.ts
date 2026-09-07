import { KOSOVO_TIME_ZONE } from "./scheduling";
export const money = (cents: number) =>
  new Intl.NumberFormat("sq-XK", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export const dateTime = (value: Date | string) =>
  new Intl.DateTimeFormat("sq-XK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: KOSOVO_TIME_ZONE,
  }).format(new Date(value));
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
