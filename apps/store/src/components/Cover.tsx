import { pick, type Book } from "@/lib/types";

/**
 * Book cover, 2:3 portrait, radius 8 (board §01).
 * Until real cover images exist, this renders the board's placeholder:
 * a sand panel with the title set in the display face.
 */
const TINTS = [
  { bg: "#EDE3D6", ink: "#6B605A" },
  { bg: "#F0E0E4", ink: "#8A5563" },
  { bg: "#E6E6DC", ink: "#5F6156" },
  { bg: "#EFE7D2", ink: "#7A6A46" },
  { bg: "#E8E2E8", ink: "#665C69" },
];

export function Cover({
  book,
  locale,
  className = "",
}: {
  book: Book;
  locale: string;
  className?: string;
}) {
  const tint = TINTS[(book.coverTint ?? 0) % TINTS.length];
  const title = pick(book.title, locale);

  if (book.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={book.coverUrl}
        alt={title}
        className={`aspect-[2/3] w-full rounded-cover object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={title}
      role="img"
      className={`flex aspect-[2/3] w-full flex-col justify-end rounded-cover p-3 ${className}`}
      style={{ background: tint.bg }}
    >
      <span
        className="font-display line-clamp-4 text-caption leading-tight"
        style={{ color: tint.ink }}
      >
        {title}
      </span>
    </div>
  );
}
