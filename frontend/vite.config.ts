import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vite Configuration for Three Man League
 *
 * Note: Firebase Functions v2 uses direct URLs (https://{function}-{hash}-uc.a.run.app)
 * rather than the v1 pattern (https://us-central1-{project}.cloudfunctions.net/{function}).
 * The frontend API layer (src/lib/api.ts) handles URL construction directly.
 *
 * For local development with the Firebase Emulator, set VITE_FUNCTIONS_URL
 * environment variable to point to the emulator (e.g., http://localhost:5001).
 */

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Firebase into its own chunk
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Split React and React Router
          react: ['react', 'react-dom', 'react-router-dom'],
          // Split icons into their own chunk
          icons: ['react-icons/lu', 'react-icons/fi'],
        },
      },
    },
    // Enable source maps for production debugging
    sourcemap: true,
    // Use esbuild for minification (faster than terser, built-in)
    minify: true,
  },
  server: {
    // Port for local development
    port: 5173,
    // Strict port - fail if port is already in use
    strictPort: true,
  },
  // Define environment variable types
  define: {
    // Ensure process.env is available for libraries that expect it
    'process.env': {},
  },
})
