import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Listen on all network interfaces (0.0.0.0)
    allowedHosts: true, // Allow ngrok, local tunnels, and external host headers
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: true,
    cors: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
