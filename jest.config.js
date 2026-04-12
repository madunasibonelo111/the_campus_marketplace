module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
  ],
  testMatch: [
    '<rootDir>/src/**/*.test.{js,jsx}',
  ],
};