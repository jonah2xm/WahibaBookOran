import { formatDzd } from "@/lib/format";

/**
 * Prices stay left-to-right inside Arabic text (brief §4), so the number
 * always carries `.lat`.
 */
export function Price({
  centimes,
  compareAt,
  size = "body",
}: {
  centimes: number;
  compareAt?: number | null;
  size?: "body" | "lg" | "total";
}) {
  const cls =
    size === "total"
      ? "text-display font-display"
      : size === "lg"
        ? "text-body-lg font-semibold"
        : "text-body font-semibold";

  return (
    <span className="flex items-baseline gap-2">
      <span className={`lat text-ink ${cls}`}>{formatDzd(centimes)}</span>
      {compareAt ? (
        <span className="lat text-caption text-ink-faint line-through">
          {formatDzd(compareAt)}
        </span>
      ) : null}
    </span>
  );
}
