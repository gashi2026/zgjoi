/**
 * Which escrow strategy a job uses.
 *
 * The deciding constraint is a hard platform limit, not a preference:
 * a card authorisation lapses after 7 days. If the professional has not
 * finished by then the hold silently drops and the guaranteed funds are
 * gone — so anything that might run longer must take the money up front.
 */
export type EscrowStrategy = "AUTH_HOLD" | "DESTINATION_CHARGE";

/** Stripe releases card authorisations after 7 days. */
export const AUTH_HOLD_DAYS = 7;
/** Safety margin: capture or cancel before the hold actually lapses. */
export const AUTH_SAFETY_HOURS = 12;
/** Funds may not sit in a connected account's ledger indefinitely. */
export const MAX_LEDGER_DAYS = 90;
/** Start chasing the job well before the ledger deadline. */
export const LEDGER_WARNING_DAYS = 75;

/** Jobs quoted at 5 working days or fewer can safely use a hold. */
export const SHORT_JOB_MAX_DAYS = 5;

export function chooseStrategy(expectedDays: number): EscrowStrategy {
  return expectedDays <= SHORT_JOB_MAX_DAYS ? "AUTH_HOLD" : "DESTINATION_CHARGE";
}

export function authExpiryFrom(now = new Date()) {
  return new Date(now.getTime() + AUTH_HOLD_DAYS * 864e5);
}

/** The moment we must have captured by, leaving the safety margin. */
export function captureDeadlineFrom(now = new Date()) {
  return new Date(
    now.getTime() + AUTH_HOLD_DAYS * 864e5 - AUTH_SAFETY_HOURS * 36e5
  );
}

export function ledgerDeadlineFrom(now = new Date()) {
  return new Date(now.getTime() + MAX_LEDGER_DAYS * 864e5);
}

/** Albanian explanation shown to the client at checkout. */
export function strategyCopy(strategy: EscrowStrategy) {
  if (strategy === "AUTH_HOLD") {
    return {
      title: "Shuma bllokohet, nuk tërhiqet ende",
      body:
        "Paratë mbeten në llogarinë tënde, por ngrihen si rezervë. Tërhiqen " +
        "vetëm kur puna të konfirmohet. Nëse puna nuk kryhet, bllokimi bie " +
        "vetvetiu dhe nuk paguan asgjë.",
      badge: "Bllokim i kartës",
    };
  }
  return {
    title: "Shuma tërhiqet dhe ruhet e mbyllur",
    body:
      "Për punë më të gjata, shuma tërhiqet menjëherë dhe ruhet e bllokuar " +
      "te Stripe. Profesionisti e sheh, por nuk mund ta tërheqë derisa ti " +
      "të konfirmosh përfundimin.",
    badge: "E mbyllur te Stripe",
  };
}

/** Albanian explanation shown to the professional. */
export function strategyCopyPro(strategy: EscrowStrategy) {
  if (strategy === "AUTH_HOLD") {
    return {
      title: "Pagesa është e rezervuar te klienti",
      body:
        `Shuma është ngrirë në kartën e klientit. Duhet ta përfundosh punën ` +
        `brenda ${AUTH_HOLD_DAYS} ditësh — pas kësaj rezerva bie dhe pagesa ` +
        `duhet rifilluar.`,
    };
  }
  return {
    title: "Pagesa është tërhequr dhe të pret",
    body:
      "Shuma është tërhequr nga klienti dhe qëndron në llogarinë tënde te " +
      "Stripe. Kalon në bankën tënde sapo klienti të konfirmojë punën.",
  };
}
