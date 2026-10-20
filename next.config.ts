import type { NextConfig } from "next";

// Derive the Supabase storage host from the environment so the same build
// works against the dev project, a production project, or a branch database.
// The wildcard fallback keeps local builds without env values working.
let supabaseHost = "*.supabase.co";
try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) supabaseHost = new URL(url).hostname;
} catch {
  // keep the wildcard fallback
}

// Baseline hardening for a public deployment (Vercel terminates TLS and adds
// HSTS for custom domains). CSP is intentionally left for a later pass — a
// strict policy needs nonce plumbing through Next's inline runtime scripts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework version.
  poweredByHeader: false,
  images: {
    // Supabase Storage serves listing images, avatars and store assets.
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
