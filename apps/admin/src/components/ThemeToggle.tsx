"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "./Switch";

/** The key the no-flash script in the locale layout reads. Keep them in sync. */
export const THEME_KEY = "bookoran31.admin.theme";

/**
 * Dark mode, admin only — the storefront stays light (design brief §3).
 *
 * This is a real preference, not a stub: the tokens for [data-theme="dark"]
 * are in globals.css. It is per-device by design, so localStorage is the
 * right home for it and it does not belong in the settings document.
 */
export function ThemeToggle() {
  const t = useTranslations("settings");
  const [dark, setDark] = useState(false);

  // Read from the DOM, which the no-flash script already set — reading
  // localStorage again here would disagree with the screen for one frame.
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function apply(next: boolean) {
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // storage blocked: the theme still applies for this page view
    }
  }

  return <Switch checked={dark} onChange={apply} label={t("darkMode")} />;
}
