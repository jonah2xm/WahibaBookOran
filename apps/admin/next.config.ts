import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // @bookoran/db ships raw TypeScript rather than a build step —
  // Next compiles it with the app.
  transpilePackages: ["@bookoran/db"],
  devIndicators: false,
};

export default withNextIntl(nextConfig);
