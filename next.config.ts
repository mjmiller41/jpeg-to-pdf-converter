/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/jpeg-to-pdf-converter',
  images: {
    unoptimized: true,
  },
  // This is important for GitHub Pages
  assetPrefix: '/jpeg-to-pdf-converter',
}

export default nextConfig