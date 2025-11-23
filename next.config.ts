import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tile.openstreetmap.org",
      },
      {
        protocol: "https",
        hostname: "tilecache.rainviewer.com",
      },
      {
        protocol: "https",
        hostname: "tile-cache.rainviewer.com",
      },
      {
        protocol: "https",
        hostname: "unpkg.com",
      },
    ],
  },
};

export default nextConfig;
