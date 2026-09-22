"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { IconBooks, IconCart, IconHome } from "./icons";
import { useCart } from "./CartProvider";

/**
 * Bottom tab bar: Accueil · Tous les livres · Panier.
 * Search lives inside the books page and in the home top bar, so it no longer
 * needs a tab of its own.
 */
export function TabBar() {
  const t = useTranslations("nav");
  const tb = useTranslations("books");
  const pathname = usePathname();
  const { count: cartCount } = useCart();
  const bumped = useBump(cartCount);

  // S4, and S5 with items in it, replace the tab bar with their own action
  // bar (board §03). The empty cart (S5·b) keeps the tab bar.
  if (pathname.startsWith("/livre/")) return null;
  if (pathname === "/panier" && cartCount > 0) return null;
  if (pathname.startsWith("/commande")) return null;

  const items = [
    { href: "/", label: t("home"), Icon: IconHome },
    { href: "/livres", label: tb("title"), Icon: IconBooks },
    { href: "/panier", label: t("cart"), Icon: IconCart, badge: cartCount },
  ];

  return (
    <nav className="sticky bottom-0 z-20 border-t border-sand-deep bg-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-[480px] items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, Icon, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-micro uppercase tracking-[0.06em] ${
                  active ? "text-rose" : "text-ink-muted"
                }`}
              >
                <span className="relative">
                  <Icon className="h-6 w-6" />
                  {badge ? (
                    <span
                      className={`lat absolute -end-2 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose px-1 text-[10px] font-semibold text-white ${
                        bumped ? "pop" : ""
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span className="line-clamp-1 text-center">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * True for one animation's length after `count` grows.
 *
 * Only on growth: a removal from the cart screen should not make the badge
 * celebrate. The first paint after the cart loads from localStorage is
 * skipped too, otherwise every page load would pulse.
 */
function useBump(count: number) {
  const [bumped, setBumped] = useState(false);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = count;
    if (before === null || count <= before) return;
    setBumped(true);
    const timer = setTimeout(() => setBumped(false), 360);
    return () => clearTimeout(timer);
  }, [count]);

  return bumped;
}
