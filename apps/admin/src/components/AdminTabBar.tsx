"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  IconBooks,
  IconDashboard,
  IconSales,
  IconSettings,
} from "./icons";

/** A2 — admin tab bar: Tableau · Livres · Ventes (badge) · Réglages. */
export function AdminTabBar({ salesBadge = 0 }: { salesBadge?: number }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const items = [
    { href: "/", label: t("dashboard"), Icon: IconDashboard },
    { href: "/livres", label: t("books"), Icon: IconBooks },
    { href: "/ventes", label: t("sales"), Icon: IconSales, badge: salesBadge },
    { href: "/reglages", label: t("settings"), Icon: IconSettings },
  ];

  return (
    <nav className="sticky bottom-0 z-20 border-t border-sand-deep bg-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-[640px] items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, Icon, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-micro uppercase tracking-[0.06em] ${
                  active ? "text-rose" : "text-ink-muted"
                }`}
              >
                <span className="relative">
                  <Icon className="h-6 w-6" />
                  {badge ? (
                    <span className="lat absolute -end-2 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose px-1 text-[10px] font-semibold text-white">
                      {badge}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
