import { localRedirect } from "@/lib/i18n/redirect";
import "server-only";
import { currentUser, accountHome, SIGNUP_ID_PATH, type Role } from "./auth";
import { idUploadsAvailable } from "./id-verification";

/**
 * Use at the top of every private page:
 *   const user = await pageGuard("PRO");
 * Redirects rather than throwing, so the user lands somewhere sensible.
 */
export async function pageGuard(...roles: Role[]) {
  const user = await currentUser();
  if (!user) return localRedirect("/hyr");
  // A new account is not complete until the ID step of the sign-up wizard is done.
  if (user.signupStep === "ID" && idUploadsAvailable()) return localRedirect(SIGNUP_ID_PATH);
  if (roles.length && !roles.includes(user.role)) {
    return localRedirect(accountHome(user.role));
  }
  return user;
}

/** The sign-up wizard's ID step: any signed-in customer or pro (no wizard redirect). */
export async function signupGuard() {
  const user = await currentUser();
  if (!user) return localRedirect("/hyr");
  return user;
}
