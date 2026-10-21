import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// This app's public address: WM_PUBLIC_URL, else the Vercel production domain, else local dev.
const origin = (value?: string) => (value ? (/^https?:\/\//.test(value) ? value : `https://${value}`).replace(/\/$/, "") : "");
const publicUrl = origin(process.env.WM_PUBLIC_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL) || "http://localhost:3007";

const nextConfig: NextConfig = {
  env: {
    // Sign-in, sign-out and "back to OrgTik" stay in this app (the suite used the SOS hub).
    NEXT_PUBLIC_SOS_URL: process.env.NEXT_PUBLIC_SOS_URL || publicUrl,
    NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:4173",
  },
  // The mock API (backend/) runs from its own files at request time: keep it out of the bundle.
  serverExternalPackages: ["orgtik-wm-backend"],
  outputFileTracingIncludes: { "/api/backend/[...path]": ["./node_modules/orgtik-wm-backend/**/*"] },
  outputFileTracingExcludes: { "/api/backend/[...path]": ["./node_modules/orgtik-wm-backend/**/*.test.*"] },
  images: { remotePatterns: [{ protocol: "http", hostname: "localhost" }] },
};

export default withNextIntl(nextConfig);
