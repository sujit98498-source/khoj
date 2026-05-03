/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // These packages use Node.js APIs not available in the edge runtime.
    // Declaring them here prevents Next.js from trying to bundle them.
    serverComponentsExternalPackages: ['firebase-admin', 'livekit-server-sdk'],
  },
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
}

module.exports = nextConfig
