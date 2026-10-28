/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Un mongod par fichier de test : limiter le parallélisme évite de saturer la machine
  maxWorkers: '50%',
  extensionsToTreatAsEsm: ['.ts'],
  // Imports ESM en `./fichier.js` → résolus vers `./fichier.ts`
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
}
