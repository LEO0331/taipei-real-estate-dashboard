import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/taipei-real-estate-dashboard/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'react-dom';
          if (id.includes('node_modules/react')) return 'react';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
        },
      },
    },
  },
});
