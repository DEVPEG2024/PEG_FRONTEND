import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import dynamicImport from 'vite-plugin-dynamic-import'
import vercel from 'vite-plugin-vercel';
import commonjs from '@rollup/plugin-commonjs';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    // Permet de lire API_ENDPOINT_URL et STRIPE_PUBLIC_KEY depuis Vercel
    // (sans le préfixe VITE_ requis normalement par Vite)
    'import.meta.env.VITE_API_ENDPOINT_URL': JSON.stringify(
      process.env.VITE_API_ENDPOINT_URL || process.env.API_ENDPOINT_URL || ''
    ),
    'import.meta.env.VITE_STRIPE_PUBLIC_KEY': JSON.stringify(
      process.env.VITE_STRIPE_PUBLIC_KEY || process.env.STRIPE_PUBLIC_KEY || ''
    ),
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'babel-plugin-macros'
        ]
      }
    }),
    dynamicImport(),
    vercel(),
    commonjs({
      include: [
        "/node_modules\/formiojs(\/|\/node_modules\/).*/",
      ],
    })
  ],
  assetsInclude: ['**/*.md'],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
  },
  server: {
    port: process.env.PORT as unknown as number,
    // ── Test sur un vrai téléphone ──────────────────────────────────────────
    // Le backend applique une liste blanche CORS stricte : seules les origines
    // http://localhost:5173, https://int.mypeg.fr et https://app.mypeg.fr sont
    // acceptées. Une URL de réseau local (http://192.168.x.x:5173) ou de tunnel
    // est donc refusée, et l'application échoue en « AxiosError: Network Error »
    // avant même la connexion.
    //
    // En définissant PEG_DEV_PROXY_TARGET, les appels API deviennent RELATIFS et
    // transitent par le serveur de développement : plus aucune requête
    // cross-origin côté navigateur, donc plus de CORS du tout.
    //
    //   PEG_DEV_PROXY_TARGET=https://api-int.mypeg.fr \
    //   VITE_API_ENDPOINT_URL=https://mon-tunnel.example.com/strapi \
    //   npm start -- --host
    //
    // ⚠️ VITE_API_ENDPOINT_URL doit être une URL ABSOLUE (celle par laquelle le
    // téléphone atteint ce serveur), jamais un chemin relatif : de nombreux
    // services construisent `${API_BASE_URL}/…` ET le passent à un axios dont le
    // baseURL vaut déjà API_BASE_URL (cf. LOGIN_API_URL dans api.constant.ts).
    // Avec une base absolue axios n'ajoute rien ; avec une base relative il
    // préfixe une seconde fois et l'appel part sur /strapi/api/strapi/api/…
    //
    // Sans cette variable, la configuration est rigoureusement inchangée. Rien
    // de tout ceci n'affecte le build de production, qui ne lit pas `server`.
    ...(process.env.PEG_DEV_PROXY_TARGET
      ? {
          host: true,
          allowedHosts: true as const,
          proxy: {
            '/strapi': {
              target: process.env.PEG_DEV_PROXY_TARGET,
              changeOrigin: true,
              rewrite: (path: string) => path.replace(/^\/strapi/, ''),
              configure: (proxy: any) => {
                // Le backend applique une liste blanche CORS et répond 500 à
                // toute origine inconnue. On retire l'en-tête Origin transmis
                // par le navigateur : la requête devient serveur-à-serveur,
                // sans origine, ce que le backend accepte.
                proxy.on('proxyReq', (proxyReq: any) => {
                  proxyReq.removeHeader('origin')
                  proxyReq.removeHeader('referer')
                })
              },
            },
          },
        }
      : {}),
  },
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1600,
    commonjsOptions: {
      requireReturnsDefault: 'auto'
    },
    rollupOptions: {
      output: {
        // Isole quelques grosses libs autonomes dans leurs propres chunks
        // (meilleur cache navigateur ; formio/pdf restent charges a la demande
        // car seuls des composants lazy les importent). Conservateur : ne
        // touche que des libs feuilles, tout le reste garde le decoupage auto.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@react-pdf') || id.includes('/react-pdf/')) return 'vendor-pdf';
          if (id.includes('formio')) return 'vendor-formio';
          if (id.includes('react-icons')) return 'vendor-icons';
          if (id.includes('@stripe')) return 'vendor-stripe';
        }
      }
    }
  }
});
