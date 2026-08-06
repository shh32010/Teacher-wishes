import { withSentryConfig } from '@sentry/nextjs';
import withBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,

  // 图片优化 — 允许加载 Supabase Storage 远程图片
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // 外部图片不强制设 deviceSizes，避免生成过多变体
    deviceSizes: [640, 768, 1024, 1280, 1536],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // framer-motion 生态：framer-motion + motion-dom + motion-utils 合并在一个 chunk 中
          // motion-dom (342KB stat) 是 framer-motion 12.x 的核心渲染引擎
          framerMotion: {
            test: /[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/,
            name: 'vendor-framer-motion',
            chunks: 'all',
            priority: 15,
            enforce: true,
          },
          // tsparticles 粒子引擎（首页懒加载，不阻塞初始包）
          tsparticles: {
            test: /[\\/]node_modules[\\/]@tsparticles[\\/]/,
            name: 'vendor-tsparticles',
            chunks: 'all',
            priority: 15,
          },
          // Supabase 全家桶（含 supabase-js + auth-js + ssr）
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'vendor-supabase',
            chunks: 'all',
            priority: 20,
            enforce: true,
          },
          // canvas-confetti 彩带（按需懒加载）
          confetti: {
            test: /[\\/]node_modules[\\/]canvas-confetti[\\/]/,
            name: 'vendor-confetti',
            chunks: 'async',
            priority: 10,
          },
          // qrcode（大屏模式按需懒加载）
          qrcode: {
            test: /[\\/]node_modules[\\/]qrcode[\\/]/,
            name: 'vendor-qrcode',
            chunks: 'async',
            priority: 10,
          },
        },
      };
    }
    return config;
  },
};

// Sentry 构建配置（仅在配置了 DSN 且为生产构建时生效）
const sentryOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.SENTRY_DSN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

export default withSentryConfig(withBundleAnalyzerConfig(nextConfig), sentryOptions);
