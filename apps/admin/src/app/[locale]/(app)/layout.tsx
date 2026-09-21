import { redirect } from "next/navigation";
import { activeAdmin } from "@/lib/session";
import { getPendingCount } from "@/lib/queries";
import { AdminTabBar } from "@/components/AdminTabBar";

/**
 * Everything in this route group requires a session. The check runs here
 * rather than in middleware so that next-intl's locale middleware stays the
 * only thing on that path — one less thing to get subtly wrong.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Checked against the database, not just the JWT: a deactivated account
  // must lose the UI as well as the API. See lib/session.ts.
  const admin = await activeAdmin();
  if (!admin) redirect(`/${locale}/connexion`);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col bg-paper shadow-lg">
      <div className="flex-1">{children}</div>
      <AdminTabBar salesBadge={await getPendingCount()} />
    </div>
  );
}
