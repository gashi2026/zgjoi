"use server";
import { localRedirect } from "@/lib/i18n/redirect";
import { createCategory, updateCategory } from "./admin";
import { requireRole } from "@/lib/server/auth";
import { AppError } from "@/lib/server/errors";
import { ZodError } from "zod";
import { getT } from "@/lib/i18n/server";
async function run(fd: FormData, save: boolean) {
  const t = await getT();
  await requireRole("ADMIN");
  let message = t("actions.changesSaved"),
    ok = true;
  try {
    if (save) await updateCategory(fd);
    else await createCategory(fd);
  } catch (error) {
    ok = false;
    message =
      error instanceof AppError
        ? t.tx(error.message)
        : error instanceof ZodError
          ? t("actions.checkCategoryFields")
          : t("actions.categoryWasntSavedPlease");
  }
  await localRedirect(
    `/admin/kategorite?${ok ? "ok" : "err"}=${encodeURIComponent(message)}`,
  );
}
export async function addCategory(fd: FormData) {
  await run(fd, false);
}
export async function saveCategory(fd: FormData) {
  await run(fd, true);
}
