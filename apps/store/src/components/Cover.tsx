import { pick, type Book } from "@/lib/types";

/**
 * A book, drawn as an object (board §01): square corners, a gutter down the
 * spine, the volume lifting off the shelf. The `.book` utility carries that
 * treatment so it can sit over a real cover image as well as a drawn one.
 *
 * A missing cover is not a grey box — the board prints the title and author
 * on a coloured spine, so the shelf still reads as books.
 */
const SPINES = ["#4e7c9b", "#d4823a", "#d2453f", "#a67c46", "#ddb870"];

export function Cover({
  book,
  locale,
  className = "",
  /** thumbnail scale — one gutter instead of three, a shallower lift */
  small = false,
}: {
  book: Book;
  locale: string;
  className?: string;
  small?: boolean;
}) {
  const title = pick(book.title, locale);
  const author = pick(book.author, locale);
  const shell = `book ${small ? "book-sm" : ""} ${className}`;

  if (book.coverUrl) {
    return (
      <div className={`${shell} overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={book.coverUrl}
          alt={title}
          className="block aspect-[2/3] w-full object-cover"
        />
      </div>
    );
  }

  const spine = SPINES[(book.coverTint ?? 0) % SPINES.length];

  return (
    <div
      aria-label={title}
      role="img"
      className={`${shell} flex aspect-[2/3] w-full flex-col justify-between ${
        small ? "ps-3 pe-1.5 py-2" : "ps-[23px] pe-3 pb-3 pt-4"
      }`}
      style={{ background: spine, color: "var(--color-cover-ink)" }}
    >
      <span
        className={`font-display leading-tight ${
          small ? "line-clamp-3 text-[7px]" : "line-clamp-4 text-[15px]"
        }`}
      >
        {title}
      </span>
      {small ? null : (
        <span className="line-clamp-1 text-[7.5px] uppercase tracking-[0.14em] opacity-65">
          {author}
        </span>
      )}
    </div>
  );
}
