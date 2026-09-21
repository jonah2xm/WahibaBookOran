"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { IconAlert, IconEye, IconEyeOff } from "@/components/icons";

/** A1 — Connexion, with the board's error state. */
export default function LoginPage() {
  const t = useTranslations("auth");
  const tb = useTranslations("brand");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(false);

    let failed = true;
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      // next-auth v5 beta does not set `error` here: a rejected credential
      // comes back as 200 with `url` pointing at /api/auth/signin?error=...
      // Checking only `res.error` silently treats a failed login as success.
      failed =
        !res ||
        Boolean(res.error) ||
        (typeof res.url === "string" && res.url.includes("error="));
    } catch {
      failed = true;
    }

    setPending(false);
    if (failed) {
      // One message for both cases on purpose: saying which half was wrong
      // tells an attacker which emails exist.
      setError(true);
      return;
    }
    router.push("/");
    router.refresh();
  }

  const field =
    "h-11 w-full rounded-input border border-sand-deep bg-surface px-4 text-body outline-none placeholder:text-ink-faint focus:border-rose";
  const label = "text-micro uppercase tracking-[0.06em] text-ink-muted";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-6 px-5">
      <div className="flex flex-col items-center gap-1">
        <span className="font-display text-display lat">{tb("name")}</span>
        <span className="text-body text-ink-muted">{t("space")}</span>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {error ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-input bg-danger/10 p-3 text-caption text-danger"
          >
            <IconAlert className="h-5 w-5 shrink-0" />
            {t("invalid")}
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("email")}</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPh")}
            className={`${field} lat`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("password")}</span>
          <span className="relative flex items-center">
            <input
              type={reveal ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} pe-12`}
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? t("hide") : t("show")}
              className="absolute end-1 grid h-11 w-11 place-items-center text-ink-faint"
            >
              {reveal ? (
                <IconEyeOff className="h-5 w-5" />
              ) : (
                <IconEye className="h-5 w-5" />
              )}
            </button>
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-1 h-11 rounded-full bg-rose text-body font-semibold text-white hover:bg-rose-hover disabled:opacity-60"
        >
          {t("submit")}
        </button>

        {/* There is no reset flow yet — the account lives in .env.local until
            Phase 1 moves it into `adminUsers`. Say so rather than pretending. */}
        <button
          type="button"
          className="h-11 text-caption text-ink-muted underline"
          onClick={() => setShowForgot(true)}
        >
          {t("forgot")}
        </button>
        {showForgot ? (
          <p className="text-center text-caption text-ink-faint">
            {t("forgotHint")}
          </p>
        ) : null}
      </form>
    </main>
  );
}
