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
    /* A hard ink rule, matching the shop: the board closes every screen
       with the same hairline it divides lists with. */
    <nav className="sticky bottom-0 z-20 border-t border-ink bg-paper">
      <ul className="mx-auto flex max-w-[640px] items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, Icon, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1.5 px-1 pb-1 pt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                  active ? "text-rose" : "text-ink-muted"
                }`}
              >
                <span className="relative">
                  <Icon className="h-[19px] w-[19px]" />
                  {badge ? (
                    <span className="lat absolute -end-3 -top-1 grid h-4 min-w-4 place-items-center rounded-pill bg-rose px-1 text-[10px] font-bold text-paper">
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
