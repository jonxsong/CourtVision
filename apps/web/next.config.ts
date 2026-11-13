import type { NextConfig } from "next";

const isServerBuild = process.env.COURTVISION_SERVER_BUILD === "1";

const nextConfig: NextConfig = {
  output: isServerBuild ? "standalone" : "export",
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: { optimizePackageImports: ["lucide-react"] },
  ...(isServerBuild ? {
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
  } : {})
};

export default nextConfig;
