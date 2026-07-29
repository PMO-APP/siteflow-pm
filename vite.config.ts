import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('react-router')) return 'react-vendor'
          if (id.includes('@supabase')) return 'supabase-vendor'
          if (id.includes('recharts')) return 'charts-vendor'
          if (id.includes('xlsx') || id.includes('jspdf') || id.includes('html2canvas')) {
            return 'document-vendor'
          }
          if (id.includes('lucide-react')) return 'icons-vendor'
          return undefined
        },
      },
    },
  },
})
