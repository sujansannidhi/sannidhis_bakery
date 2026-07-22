import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Every photograph on this site is served from public/img/ as a pre-generated
  // AVIF / WebP / JPEG set built by scripts/build-images.mjs, delivered through a
  // native <picture>. Next's image optimizer is deliberately not in the path:
  // it would re-encode work that is already done, and it cannot art-direct across
  // the 16 different aspect ratios in the source set.
  images: {
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/img/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
