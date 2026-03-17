import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: false, // TODO: Włączyć po naprawieniu double-rendering
  reactStrictMode: true, // Włączone - pomaga wykryć problemy

  // Optymalizacja dla VPS
  compress: true, // Gzip compression
  poweredByHeader: false, // Ukryj X-Powered-By header dla bezpieczeństwa

  // Optymalizacja obrazów
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 dni cache dla obrazów
    remotePatterns: [
      // Polskie strony kulinarne
      {
        protocol: 'https',
        hostname: 'cdn.aniagotuje.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'aniagotuje.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.aniagotuje.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.kuchniaidla.pl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'kuchnia.wp.pl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.kuchnia.wp.pl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'przepisy.pl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.przepisy.pl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.kwestiasmaku.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'kwestiasmaku.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.przyslijprzepis.pl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.smaker.pl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.smaker.pl',
        pathname: '/**',
      },
      // CDN i serwisy multimedialne
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.imgur.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // WordPress uploads (wiele stron używa WP)
      {
        protocol: 'https',
        hostname: '**.wordpress.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**.wordpress.com',
        pathname: '/**',
      },
    ],
  },

  // Output dla standalone deployment (Docker, VPS)
  output: 'standalone',

  // Experimental features
  experimental: {
    // Optymalizacja czasu budowania
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optymalizacja bundle size po stronie klienta
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            // Osobne chunki dla dużych bibliotek
            common: {
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            }
          }
        }
      };
    }

    // Ignoruj node:inspector w standalone build (używany przez Sentry)
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('node:inspector');
      }
    }

    return config;
  },

  // Headers dla cache control (można też ustawić w nginx)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  silent: true,

  // Upload source maps only in production
  hideSourceMaps: true,

  // Disable source maps upload in development
  disableServerWebpackPlugin: process.env.NODE_ENV !== "production",
  disableClientWebpackPlugin: process.env.NODE_ENV !== "production",

  // Additional config options for the Sentry webpack plugin.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

// Export with Sentry wrapper
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);


