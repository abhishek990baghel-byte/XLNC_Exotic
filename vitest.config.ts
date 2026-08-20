import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

process.env.NODE_ENV = 'test';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: {
      NODE_ENV: 'test',
    },
  },
});


