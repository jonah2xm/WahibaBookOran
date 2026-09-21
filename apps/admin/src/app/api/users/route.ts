import { AdminUser } from "@bookoran/db";
import { NextResponse } from "next/server";
import { route } from "@/lib/api";

/**
 * GET /api/users — who has access.
 *
 * Names, roles and status only. `passwordHash` is `select: false` on the
 * model, so it cannot reach this response even by accident, and the e-mail
 * is included because the owner needs to know which account is which.
 */
export const GET = route(async () => {
  const users = await AdminUser.find()
    .select("email name role isActive lastLoginAt")
    .sort({ role: 1, name: 1 })
    .lean();

  return NextResponse.json({
    items: users.map((u) => ({
      id: String(u._id),
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive ?? true,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
  });
});
