import type { NextConfig } from "next";

// El stack local de Supabase sirve las fotos desde 127.0.0.1. Next 16 bloquea la
// optimización de imágenes alojadas en IPs locales para evitar que el
// optimizador se use como proxy hacia la red interna, así que el permiso se
// habilita únicamente en desarrollo y nunca llega a producción.
const esDesarrollo = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    // Las fotos de producto viven en Supabase Storage. El patrón se limita a los
    // objetos públicos para que el optimizador no pueda alcanzar otras rutas
    // del proyecto.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...(esDesarrollo
        ? ([
            {
              protocol: "http" as const,
              hostname: "127.0.0.1",
              port: "54321",
              pathname: "/storage/v1/object/public/**",
            },
          ])
        : []),
    ],
    ...(esDesarrollo ? { dangerouslyAllowLocalIP: true } : {}),
  },
};

export default nextConfig;
