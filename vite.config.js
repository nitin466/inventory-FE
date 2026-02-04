import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Inventory App',
        short_name: 'Inventory',
        description: 'Inventory PWA',
        theme_color: '#242424',
        background_color: '#242424',
        display: 'standalone',
      },
    }),
  ],
})
