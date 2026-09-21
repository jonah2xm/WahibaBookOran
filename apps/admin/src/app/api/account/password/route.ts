import { AdminUser, hashPassword, verifyAdminPassword } from "@bookoran/db";
import { NextResponse } from "next/server";
import { ApiError, body, route } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/schemas";

/**
 * POST /api/account/password — change your own password.
 *
 * Your own, and only your own: the route reads the e-mail from the session
 * rather than the request, so there is no field an owner could point at
 * somebody else's account. Resetting a colleague's password is a different
 * job with different rules, and it is not this one.
 *
 * The current password is required even though the caller is already
 * authenticated. A session is not proof of identity here — a laptop left
 * unlocked is enough to have one — and the change locks the real owner out.
 *
 * Every role may do this. Staff have passwords too.
 */
export const POST = route(async ({ req, session }) => {
  const { current, next } = await body(req, passwordChangeSchema);

  // Same comparison as the login, so a wrong current password costs the same
  // time here as it does there.
  const user = await verifyAdminPassword(session.email, current);
  if (!user) {
    throw new ApiError(403, "wrong_password", "Mot de passe actuel incorrect.", {
      current: "Mot de passe actuel incorrect.",
    });
  }

  if (current === next) {
    throw new ApiError(
      422,
      "same_password",
      "Le nouveau mot de passe est identique à l'ancien.",
      { next: "Choisissez un mot de passe différent." },
    );
  }

  await AdminUser.updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(next) } },
  );

  // No new password in the response, and nothing about the old one.
  return NextResponse.json({ changed: true });
});
