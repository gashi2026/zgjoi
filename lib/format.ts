import type { Locale } from "./i18n/config";
import { formatClock, formatDateTime, formatMoney } from "./i18n/translate";
export const money = (cents: number, locale: Locale = "sq") => formatMoney(cents, locale);
// hourCycle h23: always 24-hour times such as 16:45 (never "04:45 m.d.").
export const dateTime = (value: Date | string, locale: Locale = "sq") => formatDateTime(value, locale);
/** Kosovo wall-clock time, 24-hour: "16:45". */
export const clockTime = (value: Date | string, locale: Locale = "sq") => formatClock(value, locale);
export const unreadMessagesLabel = (count: number) =>
  count === 1 ? "1 mesazh i palexuar" : `${count} mesazhe të palexuara`;
export const unreadNotificationsLabel = (count: number) =>
  count === 1 ? "1 njoftim i palexuar" : `${count} njoftime të palexuara`;
export const stateLabel = (state: string) =>
  ({
    OPEN: "Bisedë e hapur",
    QUOTED: "Oferta në pritje",
    BOOKED: "Pranuar",
    IN_PROGRESS: "Në progres",
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
