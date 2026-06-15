/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow remote product imagery from Unsplash and Vercel Blob storage.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  // Keep builds resilient: lint errors shouldn't block a production deploy.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
