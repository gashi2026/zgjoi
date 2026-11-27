import { localRedirect } from "@/lib/i18n/redirect";
import "server-only";
import { currentUser, accountHome, type Role } from "./auth";

/**
 * Use at the top of every private page:
 *   const user = await pageGuard("PRO");
 * Redirects rather than throwing, so the user lands somewhere sensible.
 */
export async function pageGuard(...roles: Role[]) {
  const user = await currentUser();
  if (!user) return localRedirect("/hyr");
  if (roles.length && !roles.includes(user.role)) {
    return localRedirect(accountHome(user.role));
  }
  return user;
}
