"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, usePathname } from "@/i18n/navigation";

type Toast = {
  /** bumped on every show so an identical message still replays the animation */
  id: number;
  message: string;
  action?: { label: string; href: string };
};

type ToastValue = (toast: Omit<Toast, "id">) => void;

const ToastContext = createContext<ToastValue | null>(null);

const DURATION = 3200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const show = useCallback<ToastValue>((next) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...next, id: ++nextId.current });
    timer.current = setTimeout(() => setToast(null), DURATION);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Pinned to the phone frame rather than the viewport, like the S4
          action bar: a viewport-wide toast would float off the shell on
          desktop.

          The offset clears whichever bar owns the bottom of the screen. S4
          swaps the 57px tab bar for BookActions' taller total-plus-button
          bar, and both add the safe-area inset themselves — so the toast has
          to add it too, or it sits under the home indicator on a phone. */}
      <div
        className={`pointer-events-none fixed inset-x-0 z-40 mx-auto w-full max-w-[480px] px-[22px] ${
          pathname.startsWith("/livre/")
            ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]"
            : "bottom-[calc(5rem+env(safe-area-inset-bottom))]"
        }`}
        aria-live="polite"
        aria-atomic="true"
      >
        {toast ? (
          <div
            key={toast.id}
            /* The board's toast is a deep-green pill with a gold check. The
               action link is not in the board — it is kept because a card
               add gives no other way back to the basket. */
            className="toast-in pointer-events-auto flex items-center gap-2.5 rounded-pill bg-deep px-[18px] py-3 text-paper"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-[15px] w-[15px] shrink-0 text-gold"
              aria-hidden
            >
              <path
                d="M4 12l6 6L20 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="min-w-0 flex-1 text-[13.5px] font-medium">
              {toast.message}
            </span>
            {toast.action ? (
              <Link
                href={toast.action.href}
                onClick={() => setToast(null)}
                className="shrink-0 whitespace-nowrap text-[13.5px] font-semibold text-gold underline-offset-2 hover:underline"
              >
                {toast.action.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
