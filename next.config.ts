/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/jpeg-to-pdf-converter',
  images: {
    unoptimized: true
  }
}

export default nextConfig