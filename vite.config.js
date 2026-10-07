import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Only inject process defines for browser build/dev, not during vitest run
  define: mode === 'test' ? {} : {
    'process.env': {},
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000,
  },
}));
