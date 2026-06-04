import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 requiere el output de Next.js estándar; no es necesario externalizar.
  // Server actions y route handlers funcionan out-of-the-box.

  // Permitir imágenes de cualquier dominio (si se necesitan en el futuro)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // Headers de seguridad (importante en producción)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
