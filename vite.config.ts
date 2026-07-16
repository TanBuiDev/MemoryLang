import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash]-ml2.js',
        chunkFileNames: 'assets/[name]-[hash]-ml2.js',
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor'
          if (id.includes('node_modules/@supabase/supabase-js')) return 'supabase'
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  // TEMPORARY: disabled for mobile debugging — re-enable after debug
  // esbuild: {
  //   drop: ['console', 'debugger'],
  // },
})
