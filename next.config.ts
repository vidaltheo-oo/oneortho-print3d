import type { NextConfig } from "next";

// En-tetes de securite. Pas de X-Frame-Options / frame-ancestors : l'espace
// client est embarque en iframe cross-origin sur le site OneOrtho (domaine a
// confirmer avant de restreindre l'embarquement).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
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
