import type { NextConfig } from "next";
import { headersSegurancaFixos } from "./lib/http-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(headersSegurancaFixos()).map(
          ([key, value]) => ({ key, value }),
        ),
      },
    ];
  },
};

export default nextConfig;
