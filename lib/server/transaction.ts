import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

/** Retries only database work; never place an external side effect in this callback. */
export async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: "Serializable", maxWait: 5000, timeout: 15000,
      });
    } catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError &&
          ["P2034", "P2002"].includes(error.code)) continue;
      throw error;
    }
  }
}
