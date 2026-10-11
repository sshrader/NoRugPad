import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The browser talks to the API through /api and /uploads on the same origin,
// so there is nothing to configure for CORS during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
      '/uploads': 'http://localhost:8787',
    },
  },
});
