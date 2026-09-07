"use server";
import {
  sendSupport,
  supportThread,
  replySupport,
  changeTicketState,
} from "@/lib/server/support";
import { AppError } from "@/lib/server/errors";
export type SupportReply = {
  ok: boolean;
  ticketId?: string;
  error?: string;
  offline?: boolean;
};
export async function sendSupportMessage(input: {
  ticketId?: string;
  body: string;
  guestName?: string;
  guestEmail?: string;
}): Promise<SupportReply> {
  try {
    return await sendSupport(input);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof AppError ? error.message : "Mesazhi nuk u dërgua.",
    };
  }
}
export async function fetchSupportThread(ticketId: string) {
  return (await supportThread(ticketId)).messages;
}
export async function agentReply(ticketId: string, body: string) {
  return replySupport({ ticketId, body });
}
export async function resolveTicket(ticketId: string) {
  return changeTicketState({ ticketId, state: "RESOLVED" });
}
