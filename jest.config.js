/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  // On ne considère comme suites que les fichiers *.test.ts(x) : les fichiers
  // utilitaires/mocks placés sous src/__tests__ ne sont donc pas exécutés.
  testMatch: ["**/*.test.ts?(x)"],
  // Polyfills globaux (TextEncoder/TextDecoder pour jsdom + react-dom/server).
  setupFiles: ["<rootDir>/jest.setup.ts"],
  // Certains modules importés (services notifications/socket) laissent un
  // timer ouvert au chargement : forceExit garantit une sortie propre en CI.
  forceExit: true,
  transform: {
    // esModuleInterop: true → les imports par défaut de modules CJS (dompurify,
    // react…) fonctionnent sous ts-jest comme lors du bundling Vite/esbuild.
    // (le tsconfig du projet a esModuleInterop:false, sans effet sur le build.)
    "^.+.tsx?$": ["ts-jest", { tsconfig: { esModuleInterop: true } }],
  },
  // Résolution de l'alias "@/..." → "src/..." (identique à Vite/tsconfig)
  // pour que les tests puissent importer les utilitaires applicatifs.
  // env.config utilise import.meta.env (Vite) : on le remplace par un stub
  // Node-compatible en test uniquement (n'affecte pas le build).
  moduleNameMapper: {
    // Intercepte aussi bien l'import alias "@/configs/env.config" que l'import
    // relatif "./env.config" (utilisé dans api.config.ts).
    "(^|/)env\\.config$": "<rootDir>/src/__tests__/__mocks__/env.config.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
