"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loading, LoadFailed } from "@/components/Async";
import { IconAlert, IconChevron } from "@/components/icons";
import { Switch } from "@/components/Switch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { wilayas } from "@/data/wilayas";
import { api, messageFor } from "@/lib/client";
import { pick } from "@/lib/types";
import { formatDzd } from "@/lib/format";

type StoreSettings = {
  storeName: string;
  phone: string;
  originWilayaId: number;
  originWilayaName: string;
  freeShippingThresholdDzd: number;
  overweightRateDzd: number;
  freeKg: number;
  stopdeskByDefault: boolean;
};

type AdminUserDto = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff";
  isActive: boolean;
};

/** A10 — Réglages: boutique, livraison, contenu, utilisateurs. */
export default function SettingsPage() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");

  const [saved, setSaved] = useState<StoreSettings | null>(null);
  const [draft, setDraft] = useState<StoreSettings | null>(null);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [settings, list] = await Promise.all([
        api.get<StoreSettings>("/api/settings"),
        api.get<{ items: AdminUserDto[] }>("/api/users"),
      ]);
      setSaved(settings);
      setDraft(settings);
      setUsers(list.items);
    } catch (e) {
      setSaved(null);
      setDraft(null);
      setLoadError(messageFor(e, tc("loadFailed")));
    }
  }, [tc]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );

  if (loadError) {
    return (
      <main className="py-10">
        <LoadFailed message={loadError} onRetry={load} />
      </main>
    );
  }

  if (!draft || !saved) {
    return (
      <main className="py-6">
        <Loading rows={6} />
      </main>
    );
  }

  const set = <K extends keyof StoreSettings>(
    key: K,
    value: StoreSettings[K],
  ) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<StoreSettings>("/api/settings", draft);
      setSaved(updated);
      setDraft(updated);
      setNote(tc("saved"));
      window.setTimeout(() => setNote(null), 5000);
    } catch (e) {
      // A staff account gets 403 here. The message says so rather than
      // looking like the save silently failed.
      setError(messageFor(e, tc("saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  const field =
    "h-11 w-full rounded-input border border-sand-deep bg-surface px-4 text-body outline-none placeholder:text-ink-faint focus:border-rose";
  const label = "text-micro uppercase tracking-[0.06em] text-ink-muted";
  const card = "mx-4 flex flex-col gap-3 rounded-card bg-surface p-4 shadow-sm";

  return (
    <main className="flex flex-col gap-5 pb-32">
      <header className="px-4 pt-4">
        <h1 className="font-display text-title">{t("title")}</h1>
      </header>

      {/* boutique */}
      <section className="flex flex-col gap-2">
        <h2 className="px-4 font-display text-body-lg font-semibold">
          {t("store")}
        </h2>
        <div className={card}>
          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("storeName")}</span>
            <input
              className={field}
              value={draft.storeName}
              onChange={(e) => set("storeName", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("phone")}</span>
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              className={`${field} lat`}
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("originWilaya")}</span>
            <select
              className={field}
              value={draft.originWilayaId}
              onChange={(e) => {
                const id = Number(e.target.value);
                const w = wilayas.find((x) => x.id === id);
                set("originWilayaId", id);
                if (w) set("originWilayaName", w.name.fr);
              }}
            >
              {wilayas.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id} — {pick(w.name, locale)}
                </option>
              ))}
            </select>
            <span className="flex items-start gap-1.5 text-caption text-ink-muted">
              <IconAlert className="h-4 w-4 shrink-0 text-rose" />
              {t("originHint")}
            </span>
          </label>
        </div>
      </section>

      {/* livraison */}
      <section className="flex flex-col gap-2">
        <h2 className="px-4 font-display text-body-lg font-semibold">
          {t("delivery")}
        </h2>
        <div className={card}>
          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("freeShipping")}</span>
            <span className="relative flex items-center">
              <input
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                className={`${field} lat pe-14`}
                value={Math.round(draft.freeShippingThresholdDzd / 100)}
                onChange={(e) =>
                  set("freeShippingThresholdDzd", Number(e.target.value) * 100)
                }
              />
              <span className="absolute end-4 text-caption text-ink-muted">
                DA
              </span>
            </span>
            <span className="text-caption text-ink-muted">
              {t("freeShippingHint", {
                amount: formatDzd(draft.freeShippingThresholdDzd),
              })}
            </span>
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={label}>{t("overweight")}</span>
              <span className="relative flex items-center">
                <input
                  type="number"
                  min={0}
                  step={10}
                  inputMode="numeric"
                  className={`${field} lat pe-16`}
                  value={Math.round(draft.overweightRateDzd / 100)}
                  onChange={(e) =>
                    set("overweightRateDzd", Number(e.target.value) * 100)
                  }
                />
                <span className="absolute end-3 text-caption text-ink-muted">
                  {t("perKg")}
                </span>
              </span>
            </label>

            <label className="flex flex-1 flex-col gap-1.5">
              <span className={label}>{t("freeKg")}</span>
              <span className="relative flex items-center">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className={`${field} lat pe-10`}
                  value={draft.freeKg}
                  onChange={(e) => set("freeKg", Number(e.target.value))}
                />
                <span className="absolute end-4 text-caption text-ink-muted">
                  kg
                </span>
              </span>
            </label>
          </div>

          <Row
            label={t("stopdeskDefault")}
            hint={t("stopdeskHint")}
            control={
              <Switch
                checked={draft.stopdeskByDefault}
                onChange={(v) => set("stopdeskByDefault", v)}
                label={t("stopdeskDefault")}
              />
            }
          />
        </div>

        {/* These numbers feed the Yalidine quote. Saying where they actually
            apply today is the difference between a setting and a decoration. */}
        <p className="mx-4 flex gap-2 rounded-card bg-warning/12 p-3 text-caption text-warning">
          <IconAlert className="h-4 w-4 shrink-0" />
          {t("notLiveYet")}
        </p>
      </section>

      {/* contenu */}
      <section className="flex flex-col gap-2">
        <h2 className="px-4 font-display text-body-lg font-semibold">
          {t("content")}
        </h2>
        <Link
          href="/conditions"
          className="mx-4 flex items-center justify-between rounded-card bg-surface px-4 py-3.5 text-body shadow-sm"
        >
          {t("agreement")}
          <IconChevron className="h-4 w-4 text-ink-faint" />
        </Link>
      </section>

      {/* utilisateurs */}
      <section className="flex flex-col gap-2">
        <h2 className="px-4 font-display text-body-lg font-semibold">
          {t("users")}
        </h2>
        <div className={card}>
          <ul className="flex flex-col gap-3">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <span className="lat grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-caption font-semibold text-rose">
                  {u.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-body font-semibold">{u.name}</span>
                  <span className="lat line-clamp-1 text-caption text-ink-muted">
                    {u.email}
                  </span>
                </span>
                <span className="ms-auto flex shrink-0 items-center gap-2">
                  {!u.isActive ? (
                    <span className="rounded-full bg-ink/8 px-2.5 py-1 text-micro uppercase tracking-[0.06em] text-ink-muted">
                      {t("inactive")}
                    </span>
                  ) : null}
                  <span className="text-caption text-ink-muted">
                    {t(`role.${u.role}`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/* Inviting a user means creating credentials, and A1 authenticates
              against a single env pair today. The button would have nowhere
              to write, so it says that instead of opening an empty form. */}
          <button
            type="button"
            onClick={() => {
              setNote(t("inviteStub"));
              window.setTimeout(() => setNote(null), 5000);
            }}
            className="h-11 w-fit rounded-full border border-sand-deep px-4 text-caption font-semibold"
          >
            {t("invite")}
          </button>
        </div>
      </section>

      {/* apparence + compte */}
      <section className="flex flex-col gap-2">
        <h2 className="px-4 font-display text-body-lg font-semibold">
          {t("appearance")}
        </h2>
        <div className={card}>
          <Row label={t("darkMode")} control={<ThemeToggle />} />
        </div>
      </section>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: `/${locale}/connexion` })}
        className="mx-4 h-12 rounded-full border border-danger/40 text-body font-semibold text-danger"
      >
        {ta("signOut")}
      </button>

      {note ? (
        <p
          role="status"
          className="mx-4 rounded-card bg-success/12 p-3 text-caption text-success"
        >
          {note}
        </p>
      ) : null}

      {/* save bar */}
      <div className="fixed inset-x-0 bottom-[56px] z-20 mx-auto w-full max-w-[640px] border-t border-sand-deep bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex-1 text-caption text-ink-muted">
            {error ? (
              <span className="text-danger">{error}</span>
            ) : dirty ? (
              t("dirty")
            ) : (
              t("upToDate")
            )}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="h-11 rounded-full bg-rose px-6 text-body font-semibold text-white hover:bg-rose-hover disabled:bg-sand-deep disabled:text-ink-faint"
          >
            {saving ? tc("loading") : t("save")}
          </button>
        </div>
      </div>
    </main>
  );
}

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body">{label}</span>
        {hint ? (
          <span className="text-caption text-ink-muted">{hint}</span>
        ) : null}
      </span>
      {control}
    </div>
  );
}
