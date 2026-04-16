import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Mode, plugin as markdownPlugin } from 'vite-plugin-markdown';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), markdownPlugin({ mode: [Mode.MARKDOWN] })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
