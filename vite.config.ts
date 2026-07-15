import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const vendorChunks = [
  ['react-dom', ['node_modules/react-dom']],
  ['react', ['node_modules/react']],
  ['charts', ['node_modules/recharts', 'node_modules/d3-']],
] as const;

export default defineConfig({
  plugins: [react()],
  base: '/taipei-real-estate-dashboard/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => vendorChunks.find(([, paths]) => paths.some((path) => id.includes(path)))?.[0],
      },
    },
  },
});
