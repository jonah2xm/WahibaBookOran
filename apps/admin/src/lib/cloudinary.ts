import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary, server side only.
 *
 * `server-only` makes importing this from a client component a build error.
 * The API secret can delete the entire media library, so it must never reach
 * a bundle — that is also why uploads are SIGNED rather than using an
 * unsigned preset: an unsigned preset is readable in page source and lets
 * anyone upload anything to the account.
 *
 * The cloud name is not secret. It is inside every delivery URL.
 */

export const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "";
export const FOLDER = process.env.CLOUDINARY_FOLDER ?? "bookoran31/covers";

const API_KEY = process.env.CLOUDINARY_API_KEY ?? "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "";

export const cloudinaryConfigured = Boolean(
  CLOUD_NAME && API_KEY && API_SECRET,
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
}

/**
 * Signs one upload.
 *
 * The public_id is the book's slug, so re-uploading a cover REPLACES the old
 * file instead of leaving an orphan behind — a library that only grows is how
 * a free tier fills up with images nothing points at.
 */
export function signUpload(slug: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const params = {
    public_id: `${FOLDER}/${slug}`,
    timestamp,
    overwrite: true,
    invalidate: true,
  };

  // Cloudinary signs every parameter that is sent except the file itself,
  // api_key and cloud_name. Sending a parameter that was not signed fails the
  // upload, so this list and the one the browser posts must stay identical.
  const signature = cloudinary.utils.api_sign_request(params, API_SECRET);

  return { ...params, signature, apiKey: API_KEY, cloudName: CLOUD_NAME };
}

/**
 * The URL stored on the book.
 *
 * Not the raw `secure_url` Cloudinary returns: that serves the original file,
 * which for a phone photo of a cover is several megabytes. These transforms
 * are applied by Cloudinary on delivery, so the shop sends a ~600px WebP over
 * a mobile connection instead.
 *
 *   f_auto  the best format the browser accepts
 *   q_auto  quality chosen per image
 *   c_fill  crop to the 2:3 the design uses, rather than squashing
 */
export function deliveryUrl(publicId: string, version?: number) {
  const v = version ? `v${version}/` : "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,ar_2:3,w_600/${v}${publicId}`;
}
