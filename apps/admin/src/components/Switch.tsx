"use client";

/** Board §A10 switch. Uses `start-*` so the knob flips side with the locale. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-11 shrink-0 rounded-pill transition-colors ${
        checked ? "bg-rose" : "bg-sand-deep"
      }`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-pill bg-paper transition-[inset-inline-start] ${
          checked ? "start-[21px]" : "start-[3px]"
        }`}
      />
    </button>
  );
}
