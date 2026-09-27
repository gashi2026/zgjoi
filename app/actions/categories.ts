"use server";
import { redirect } from "next/navigation";
import { createCategory, updateCategory } from "./admin";
import { requireRole } from "@/lib/server/auth";
import { AppError } from "@/lib/server/errors";
import { ZodError } from "zod";
async function run(fd: FormData, save: boolean) {
  await requireRole("ADMIN");
  let message = "Ndryshimet u ruajtën.",
    ok = true;
  try {
    if (save) await updateCategory(fd);
    else await createCategory(fd);
  } catch (error) {
    ok = false;
    message =
      error instanceof AppError
        ? error.message
        : error instanceof ZodError
          ? "Kontrolloni fushat e kategorisë."
          : "Kategoria nuk u ruajt. Provoni përsëri.";
  }
  redirect(
    `/admin/kategorite?${ok ? "ok" : "err"}=${encodeURIComponent(message)}`,
  );
}
export async function addCategory(fd: FormData) {
  await run(fd, false);
}
export async function saveCategory(fd: FormData) {
  await run(fd, true);
}
