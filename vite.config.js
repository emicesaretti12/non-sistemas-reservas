import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // `__dirname` no existe en módulos ESM: antes esto sólo funcionaba de
      // casualidad porque Vite transpila el config.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Con el code splitting por ruta ningún chunk debería acercarse a este
    // límite; si el aviso aparece, algo volvió a quedar en el bundle común.
    chunkSizeWarningLimit: 700,
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    // El HMR apuntaba fijo a wss://<host>:443, una herencia del preview en la
    // nube: en local el websocket nunca conectaba y había que recargar a mano.
  },
})