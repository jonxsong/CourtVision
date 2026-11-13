import type { NextConfig } from "next";

const isStaticExport = process.env.SITES_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: { optimizePackageImports: ["lucide-react"] },
  ...(isStaticExport ? {} : {
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
          ]
        }
      ];
    }
  })
};

export default nextConfig;
