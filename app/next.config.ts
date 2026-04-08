import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'https://mail.dynmsl.com/api/public/:path*',
      },
    ];
  },
};

export default nextConfig;
