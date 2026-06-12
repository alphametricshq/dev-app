import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@libsql/client"],
  devIndicators: false,
  // O process.cwd() em lib/db/index.ts faz o file tracing incluir a pasta
  // inteira do projeto no standalone (dist-electron com builds antigos,
  // banco de dados local, logs) — explode o tamanho do instalador.
  outputFileTracingExcludes: {
    "*": ["dist-electron/**", "data/**", "**/*.log", ".git/**"],
  },
};

export default nextConfig;
