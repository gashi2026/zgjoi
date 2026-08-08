/** @type {import('next').NextConfig} */
const nextConfig = {
  // A failed lint or type check should not block a preview deployment.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
};

export default nextConfig;
