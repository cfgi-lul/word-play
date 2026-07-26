import { generateSW } from 'workbox-build';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const browserDir = path.join(root, 'dist/word-play/browser');

const ghPages = process.argv.includes('--gh-pages');
const urlPrefix = ghPages ? '/word-play/' : '/';

const { count, size, warnings } = await generateSW({
  globDirectory: browserDir,
  globPatterns: [
    '**/*.{html,js,css,ico,png,svg,webmanifest,woff,woff2,txt}',
  ],
  // Icon pack is huge; cache icons on demand instead of precaching thousands of SVGs.
  globIgnores: ['assets/taiga-ui/icons/**', 'sw.js', 'workbox-*.js'],
  swDest: path.join(browserDir, 'sw.js'),
  modifyURLPrefix: {
    '': urlPrefix,
  },
  navigateFallback: `${urlPrefix}index.html`,
  navigateFallbackAllowlist: [/^(?!\/__).*/],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.includes('/assets/taiga-ui/icons/'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'taiga-icons',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: ({ url }) =>
        url.origin === 'https://fonts.googleapis.com' ||
        url.origin === 'https://fonts.gstatic.com',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
  ],
});

if (warnings.length > 0) {
  console.warn('Workbox warnings:\n' + warnings.join('\n'));
}

console.log(
  `Generated Workbox service worker (precache ${count} files, ${(size / 1024).toFixed(1)} KiB)`,
);
