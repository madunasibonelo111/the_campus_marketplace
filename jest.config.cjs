module.exports = {
  rootDir: "./",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

moduleNameMapper: {
  "\\.(css|less|scss|sass)$": "identity-obj-proxy",

  "^@/supabase/supabaseClient$": "<rootDir>/src/__mocks__/supabaseClient.js",

  "^@/(.*)$": "<rootDir>/src/$1"
},
  
  testEnvironment: "jsdom",

  transform: {
    // Explicitly point to the Babel config to handle import.meta
    "^.+\\.(js|jsx)$": ["babel-jest", { configFile: "./babel.config.cjs" }],
  },

  transformIgnorePatterns: [
    "/node_modules/(?!(@supabase)/)"
  ],

  moduleFileExtensions: ["js", "jsx", "json", "node"],

  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/**/*.test.{js,jsx}",
    "!src/main.jsx",
    "!src/App.jsx",
    "!src/supabase/supabaseClient.js"
  ],

  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },

  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"]
};