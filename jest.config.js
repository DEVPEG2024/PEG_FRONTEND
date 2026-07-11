/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  // Résolution de l'alias "@/..." → "src/..." (identique à Vite/tsconfig)
  // pour que les tests puissent importer les utilitaires applicatifs.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
