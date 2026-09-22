"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, messageFor } from "@/lib/client";

/**
 * Changing your own password, from Réglages.
 *
 * Collapsed until asked for: it is rare, and an open password form on a
 * settings screen invites a browser to offer to fill it every visit.
 *
 * The server requires the current password and is the only thing that
 * decides whether the change is allowed. Everything checked here is checked
 * again there — this is for a fast answer, not for safety.
 */
export function PasswordChange() {
  const t = useTranslations("password");
  const tc = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const field =
    "h-11 w-full rounded-input border border-sand-deep bg-surface px-3 text-body outline-none focus:border-rose";

  function reset() {
    setCurrent("");
    setNext("");
    setRepeat("");
    setShow(false);
    setError(null);
  }

  async function submit() {
    setError(null);

    // Caught here because the server never sees `repeat` — it is a typo
    // guard for the person typing, not a rule about the account.
    if (next !== repeat) {
      setError(t("mismatch"));
      return;
    }

    setBusy(true);
    try {
      await api.post("/api/account/password", { current, next });
      reset();
      setOpen(false);
      setDone(true);
      window.setTimeout(() => setDone(false), 6000);
    } catch (e) {
      setError(messageFor(e, tc("saveFailed")));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-11 w-fit rounded-pill border border-sand-deep px-4 text-caption font-semibold"
        >
          {t("change")}
        </button>
        {done ? (
          <p role="status" className="text-caption text-success">
            {t("changed")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type={show ? "text" : "password"}
        autoComplete="current-password"
        className={field}
        placeholder={t("current")}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <input
        type={show ? "text" : "password"}
        autoComplete="new-password"
        className={field}
        placeholder={t("new")}
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <input
        type={show ? "text" : "password"}
        autoComplete="new-password"
        className={field}
        placeholder={t("repeat")}
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
      />

      <label className="flex items-center gap-2 text-caption text-ink-muted">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
        />
        {t("showPasswords")}
      </label>

      <p className="text-caption text-ink-muted">{t("hint")}</p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !current || next.length < 10 || !repeat}
          onClick={submit}
          className="h-11 rounded-pill bg-rose px-5 text-caption font-semibold text-paper disabled:bg-sand-deep disabled:text-ink-faint"
        >
          {busy ? tc("loading") : t("submit")}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="h-11 rounded-pill border border-sand-deep px-5 text-caption font-semibold"
        >
          {tc("cancel")}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
