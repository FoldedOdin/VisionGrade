import '@testing-library/jest-dom';

// Mock matchMedia for react-hot-toast
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock import.meta for Vite
global.importMeta = {
  env: {
    VITE_API_BASE_URL: 'http://localhost:3001'
  }
};