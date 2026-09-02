import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Nhost backend configuration for Vercel deployment
  // Set NEXT_PUBLIC_NHOST_SUBDOMAIN in Vercel env vars to enable Nhost production mode
  // Example: NEXT_PUBLIC_NHOST_SUBDOMAIN="my-clinic-abc123"
  // Optional: NEXT_PUBLIC_NHOST_REGION (default: ap-southeast-1)

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Allowed image domains (add your Nhost storage domain if needed)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.storage.nhost.run',
      },
    ],
  },
}

export default nextConfig
