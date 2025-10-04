// Mock for import.meta in Jest environment
export default {
  env: {
    VITE_API_BASE_URL: 'http://localhost:3001',
    VITE_APP_NAME: 'VisionGrade',
    MODE: 'test',
    DEV: false,
    PROD: false
  }
};