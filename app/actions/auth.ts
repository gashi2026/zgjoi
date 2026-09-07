"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { accountHome, createSession, destroySession } from "@/lib/server/auth";
import { authenticate, signup } from "@/lib/server/accounts";
import { AppError } from "@/lib/server/errors";
import { requestIp } from "@/lib/server/http";
import { ZodError } from "zod";
export type ActionState = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};
async function register(
  role: "CLIENT" | "PRO",
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    const raw = Object.fromEntries(formData);
    user = await signup(
      { ...raw, role, terms: raw.terms === "on" || raw.terms === "true" },
      requestIp(await headers()),
    );
    await createSession(user.id);
  } catch (error) {
    if (error instanceof AppError || error instanceof ZodError)
      return {
        ok: false,
        message:
          error instanceof AppError
            ? error.message
            : "Kontrolloni fushat e formularit.",
      };
    return {
      ok: false,
      message: "Regjistrimi nuk u përfundua. Provoni përsëri.",
    };
  }
  redirect(accountHome(user.role));
}
export async function registerClient(_: ActionState, formData: FormData) {
  return register("CLIENT", formData);
}
export async function registerPro(_: ActionState, formData: FormData) {
  return register("PRO", formData);
}
export async function login(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await authenticate(
      Object.fromEntries(formData),
      requestIp(await headers()),
    );
    await createSession(user.id);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof AppError
          ? error.message
          : "Hyrja nuk u përfundua. Provoni përsëri.",
    };
  }
  redirect(accountHome(user.role));
}
export async function logout() {
  await destroySession();
  redirect("/");
}
