import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,           // слушать на всех интерфейсах
    port: 3000,           // используем нестандартный порт
    strictPort: true,     // чтобы Vite не менял порт автоматически
    allowedHosts: [
      'diskogoi.ddns.net',
      'disosogoi.loca.lt',
      '127.0.0.1'
    ],
  }
});
