import { AgreementSection } from "@bookoran/db";
import { NextResponse } from "next/server";
import { body, route } from "@/lib/api";
import { agreementSchema } from "@/lib/schemas";

/** GET /api/agreement — every section in order, including inactive ones. */
export const GET = route(async () => {
  const sections = await AgreementSection.find().sort({ sortOrder: 1 }).lean();

  return NextResponse.json({
    sections: sections.map((s) => ({
      key: s.key,
      title: { fr: s.title.fr, ar: s.title.ar ?? undefined },
      points: s.points.map((p) => ({ fr: p.fr, ar: p.ar ?? undefined })),
      needsReview: s.needsReview ?? false,
    })),
    publishedAt:
      sections.reduce<Date | null>(
        (latest, s) =>
          s.publishedAt && (!latest || s.publishedAt > latest)
            ? s.publishedAt
            : latest,
        null,
      )?.toISOString() ?? null,
  });
});

/**
 * PUT /api/agreement — replace the whole list.
 *
 * Whole-list rather than per-section: A9 reorders sections, and order is a
 * property of the list, not of any one row. Sending the list means the order
 * the owner sees is exactly what is stored, with no chance of two half-
 * applied reorders leaving duplicate positions.
 *
 * Sections the body omits are deactivated, never deleted — these are terms
 * customers may already have agreed to, and the record of what they agreed
 * to has to survive an edit.
 */
export const PUT = route(async ({ req }) => {
  const input = await body(req, agreementSchema);
  const publishedAt = input.publish ? new Date() : undefined;

  const keptKeys = input.sections.map((s) => s.key);

  for (const [i, section] of input.sections.entries()) {
    await AgreementSection.findOneAndUpdate(
      { key: section.key },
      {
        $set: {
          title: section.title,
          points: section.points,
          sortOrder: i + 1,
          isActive: true,
          needsReview: section.needsReview ?? false,
          ...(publishedAt ? { publishedAt } : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );
  }

  const { modifiedCount } = await AgreementSection.updateMany(
    { key: { $nin: keptKeys }, isActive: true },
    { $set: { isActive: false } },
  );

  return NextResponse.json({
    saved: input.sections.length,
    deactivated: modifiedCount,
    publishedAt: publishedAt?.toISOString() ?? null,
  });
}, { owner: true });
