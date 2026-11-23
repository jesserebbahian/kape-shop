import { defineConfig } from 'vite';
import { frontendConfig } from './frontend/vite.config.js';

const config = frontendConfig();
export default defineConfig({
  ...config,
  root: 'frontend',
  envDir: '..',
  build: { outDir: '../dist', emptyOutDir: true }
});
