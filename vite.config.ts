
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O Render.com injeta as variáveis de ambiente durante o build.
// Usamos o 'define' para expor a API_KEY para o código do cliente (browser).
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true
  },
  server: {
    port: 3000
  }
});
