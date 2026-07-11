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
