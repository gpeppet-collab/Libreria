/**
 * Due progetti Jest:
 * - "node": test puri (dominio e repository) senza runtime React Native, con SQLite reale via node:sqlite;
 * - "expo": test di componenti, hook e servizi con il preset jest-expo.
 */
module.exports = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/domain/**/__tests__/**/*.test.ts',
        '<rootDir>/src/data/**/__tests__/**/*.test.ts',
      ],
      transform: { '^.+\\.tsx?$': 'babel-jest' },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
    {
      displayName: 'expo',
      preset: 'jest-expo',
      testMatch: [
        '<rootDir>/app/**/__tests__/**/*.test.tsx',
        '<rootDir>/src/{ui,hooks,services}/**/__tests__/**/*.test.ts',
        '<rootDir>/src/{ui,hooks,services}/**/__tests__/**/*.test.tsx',
      ],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
  ],
};
