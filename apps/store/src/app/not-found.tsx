import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * A path with no locale at all (e.g. /panier typed by hand) has no messages
 * loaded, so it cannot render the designed 404. Send it to the default locale
 * and let the localised not-found take over.
 */
export default function RootNotFound() {
  redirect(`/${routing.defaultLocale}`);
}
