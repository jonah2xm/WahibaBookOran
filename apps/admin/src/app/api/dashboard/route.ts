import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getDashboardData } from "@/lib/queries";

/**
 * GET /api/dashboard — the A2 tiles.
 *
 * The figures come from getDashboardData(), which the A2 server component
 * also calls directly. One definition, two callers.
 */
export const GET = route(async () => {
  return NextResponse.json(await getDashboardData());
});
