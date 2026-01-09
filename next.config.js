/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname + '/app',
      '@/components': __dirname + '/app/components',
      '@/types': __dirname + '/app/types',
    };
    return config;
  },
  images: {
    domains: ['via.placeholder.com'], // Add any image domains you use
  },
};

module.exports = nextConfig;
