/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.STAGING_TEST_MODE === "true" ? { skipTrailingSlashRedirect: true, skipMiddlewareUrlNormalize: true } : {}),
  images: {
    // Local property photography; remotePatterns can be added when a CDN is chosen.
    remotePatterns: [],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
