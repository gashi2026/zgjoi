import "server-only";
import { redirect } from "next/navigation";
import { currentUser, type Role } from "./auth";

/**
 * Use at the top of every private page:
 *   const user = await pageGuard("PRO");
 * Redirects rather than throwing, so the user lands somewhere sensible.
 */
export async function pageGuard(...roles: Role[]) {
  const user = await currentUser();
  if (!user) redirect("/hyr");
  if (roles.length && !roles.includes(user.role)) {
    redirect(user.role === "PRO" ? "/pro/paneli" : "/llogaria");
  }
  return user;
}
