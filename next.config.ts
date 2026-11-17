import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['morphgrid'],
  redirects: async () => [
    // The project's .vercel.app address serves the same pages; send it to the real domain so search engines index one copy.
    { source: '/:path*', has: [{ type: 'host', value: 'xboxgraph.vercel.app' }], destination: 'https://xbox.morphgrid.io/:path*', permanent: true },
  ],
};

export default config;
