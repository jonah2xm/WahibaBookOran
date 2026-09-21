import type { MetadataRoute } from "next";
import { absolute } from "@/lib/site";

/**
 * /robots.txt
 *
 * The catalogue is meant to be found. What is disallowed is everything that
 * belongs to one visitor: a basket, a checkout in progress, a confirmation
 * page, and tracking — which takes an order number and a phone number in the
 * URL and must never end up in a search index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/panier", "/*/commande", "/*/suivi"],
    },
    sitemap: absolute("/sitemap.xml"),
  };
}
