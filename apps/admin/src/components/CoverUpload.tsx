"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api, messageFor } from "@/lib/client";

type Signature = {
  public_id: string;
  timestamp: number;
  overwrite: boolean;
  invalidate: boolean;
  signature: string;
  apiKey: string;
  cloudName: string;
};

/** Matches the server's deliveryUrl(). Same transforms, no version. */
function deliveryUrl(cloudName: string, publicId: string) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_fill,ar_2:3,w_600/${publicId}`;
}

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Cover picker for the book editor.
 *
 * The file goes straight from the browser to Cloudinary. This never posts the
 * image to our own server: Vercel caps a function request body at 4.5 MB, and
 * a photo taken on a phone is routinely larger than that.
 *
 * The flow is: ask our API to sign one upload (it checks the session and that
 * the book exists), POST the file to Cloudinary with that signature, then
 * hand the resulting URL back so the editor can save it on the book.
 */
export function CoverUpload({
  slug,
  onUploaded,
  onError,
}: {
  slug: string;
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file: File) {
    // Checked here for a fast, clear answer, and again by Cloudinary, which
    // is the one that actually matters.
    if (!TYPES.includes(file.type)) {
      onError(t("coverType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      onError(t("coverTooBig"));
      return;
    }

    setBusy(true);
    onError("");

    try {
      const sig = await api.post<Signature>("/api/uploads/signature", { slug });

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("public_id", sig.public_id);
      form.append("overwrite", String(sig.overwrite));
      form.append("invalidate", String(sig.invalidate));
      form.append("signature", sig.signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: form },
      );

      if (!res.ok) {
        // Cloudinary's own message is the useful one here — "Invalid
        // signature" and "File size too large" need different fixes.
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error?.message ?? tc("saveFailed"));
      }

      const json = (await res.json()) as { public_id: string };

      // Built rather than taking `secure_url`: that one serves the original
      // file. This is the resized, reformatted delivery URL.
      onUploaded(deliveryUrl(sig.cloudName, json.public_id));
    } catch (e) {
      onError(messageFor(e, tc("saveFailed")));
    } finally {
      setBusy(false);
      // Clears the selection so choosing the same file twice still fires.
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="h-11 w-fit rounded-full border border-sand-deep bg-surface px-4 text-caption font-semibold disabled:text-ink-faint"
      >
        {busy ? t("coverUploading") : t("replace")}
      </button>
    </>
  );
}
