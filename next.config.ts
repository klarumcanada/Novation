import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/agora',
        destination: 'https://agora-three-swart.vercel.app/agora',
      },
      {
        source: '/agora/:path*',
        destination: 'https://agora-three-swart.vercel.app/agora/:path*',
      },
    ]
  },
};

export default nextConfig;
