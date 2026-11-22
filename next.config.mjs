/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  async redirects() {
    return [
      // slug lama PP1 Banjar -> PP1 Banjarmasin (penamaan seragam)
      {
        source: "/monitoring/pp1-banjar",
        destination: "/monitoring/pp1-banjarmasin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;