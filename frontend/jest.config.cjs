const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/test-utils/__mocks__/fileMock.js'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-hot-toast|@heroicons|lucide-react)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/setupTests.js',
    '!src/test-utils/**',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
  ],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  testTimeout: 10000,
  globals: {
    'import.meta': {
      env: {
        VITE_API_BASE_URL: 'http://localhost:3001',
        MODE: 'test',
        DEV: false,
        PROD: false
      }
    }
  },
  setupFiles: ['<rootDir>/src/test-utils/jest-setup.js']
};

module.exports = config;