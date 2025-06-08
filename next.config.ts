/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Remove basePath and assetPrefix during development
  ...(process.env.NODE_ENV === 'production' && {
    basePath: '/jpeg-to-pdf-converter',
    assetPrefix: '/jpeg-to-pdf-converter',
  }),
  images: {
    unoptimized: true,
  },
  experimental: {
    // Remove turbo configuration
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devServer = {
        ...config.devServer,
        host: '0.0.0.0',
        allowedHosts: 'all',
      }
    }
    return config
  }
}

export default nextConfig