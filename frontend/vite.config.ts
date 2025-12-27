import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isTest = process.env.VITEST === 'true';

export default defineConfig({
  plugins: [react()],
  ...(isTest
    ? {
        test: {
          globals: true,
          environment: 'jsdom',
          setupFiles: './vitest.setup.ts',
        },
      }
    : {})
});
