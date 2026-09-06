import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: así los assets se resuelven igual sirviendo desde la
  // raíz (npm run dev / preview) o desde un subdirectorio, como pasa con
  // GitHub Pages (usuario.github.io/nombre-del-repo/).
  base: './',
  plugins: [
    react()
  ],
})
