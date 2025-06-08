import type { NextConfig } from 'next'
import type { Configuration as WebpackConfig, WebpackPluginInstance } from 'webpack'

/** @type {import('next').NextConfig} */
interface ExperimentalConfig {
  // Remove turbo configuration
  // Add other experimental options here if needed
}

interface ImagesConfig {
  unoptimized: boolean
}

interface WebpackOptions {
  dev: boolean
  isServer: boolean
  webpack: typeof import('webpack')
  buildId: string
  config: NextConfig
  defaultLoaders: {
    babel: any
  }
  dir: string
  totalPages: number
  isDevFallback?: boolean
  nextRuntime?: string
  entrypoints: any
}

interface CustomNextConfig {
  output: string
  basePath?: string
  assetPrefix?: string
  images: ImagesConfig
  experimental: ExperimentalConfig
  webpack: NonNullable<NextConfig['webpack']>
}

const nextConfig: CustomNextConfig = {
  output: 'export',
  // Remove basePath and assetPrefix during development
  ...(process.env.NODE_ENV === 'production' && {
    basePath: '/',
    assetPrefix: '/',
  }),
  images: {
    unoptimized: true,
  },
  experimental: {
    // Remove turbo configuration
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // @ts-ignore
      config.devServer = {
        // @ts-ignore
        ...config.devServer,
        host: '0.0.0.0',
        allowedHosts: 'all',
      }
    }
    return config
  }
}

export default nextConfig