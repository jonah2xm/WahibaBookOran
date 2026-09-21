import { Book } from "@bookoran/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, body, notFound, route } from "@/lib/api";
import { cloudinaryConfigured, signUpload } from "@/lib/cloudinary";

/**
 * POST /api/uploads/signature — permission to upload one cover.
 *
 * The browser sends the file straight to Cloudinary, not through here. Two
 * reasons: Vercel caps a serverless request body at 4.5 MB and a photo of a
 * book cover clears that easily, and proxying the bytes would burn function
 * time for nothing.
 *
 * What this route gives out is narrow on purpose — a signature valid for one
 * public_id, `<folder>/<slug>`, for about an hour. It cannot be used to
 * overwrite an unrelated asset, and it is behind the admin session like
 * everything else in this directory.
 */

const signatureSchema = z.object({
  slug: z.string().trim().min(1),
});

export const POST = route(async ({ req }) => {
  if (!cloudinaryConfigured) {
    throw new ApiError(
      503,
      "uploads_not_configured",
      "L'envoi d'images n'est pas configuré : il manque les identifiants Cloudinary sur le serveur.",
    );
  }

  const { slug } = await body(req, signatureSchema);

  // Sign only for a book that exists. Without this the route would hand out
  // a signature for any public_id a caller cared to name.
  const book = await Book.findOne({ slug }).select("_id").lean();
  if (!book) notFound("Livre");

  return NextResponse.json(signUpload(slug));
});
