module.exports = {
  testEnvironment: 'jsdom',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
  ],
  testPathPattern: [
    '<rootDir>/src/**/*.test.{js,jsx}',
  ],
};