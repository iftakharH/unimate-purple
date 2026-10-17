import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage serves listing images, avatars and store assets.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jleztdtwkctvuogaechh.supabase.co",
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
};

export default nextConfig;
