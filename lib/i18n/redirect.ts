import { redirect } from "next/navigation";
import { localizePath } from "./config";
import { getLocale } from "./server";

/** next/navigation redirect() that keeps the visitor's language (/en prefix for English). */
export async function localRedirect(path: string, type?: Parameters<typeof redirect>[1]): Promise<never> {
  redirect(localizePath(path, await getLocale()), type);
}
