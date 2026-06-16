import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um build "standalone" (server.js + deps mínimas) para a imagem Docker
  // ficar pequena e não precisar de `npm install` em produção.
  output: "standalone",
};

export default nextConfig;
