import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La racine de l'app redirige vers le configurateur (point d'entree client).
  async redirects() {
    return [
      {
        source: "/",
        destination: "/configurateur",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
