import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Firebase Cloud Functions base URL
const FUNCTIONS_BASE = 'https://us-central1-three-man-league.cloudfunctions.net';

// Helper to create proxy config for a function
const proxyFn = (name: string) => ({
  [`/${name}`]: {
    target: `${FUNCTIONS_BASE}/${name}`,
    changeOrigin: true,
    rewrite: () => '',
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Firebase into its own chunk
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Split React and React Router
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    proxy: {
      // Existing functions
      ...proxyFn('submitPicks'),
      ...proxyFn('aiChat'),
      ...proxyFn('syncSchedule'),
      ...proxyFn('syncPlayers'),
      ...proxyFn('scoreWeek'),
      ...proxyFn('computeSeasonStandings'),
      ...proxyFn('initializeLeague'),
      // League management functions
      ...proxyFn('createLeague'),
      ...proxyFn('joinLeague'),
      ...proxyFn('getUserLeagues'),
      ...proxyFn('getLeagueDetails'),
      ...proxyFn('updateLeagueSettings'),
      ...proxyFn('regenerateJoinCode'),
      ...proxyFn('leaveOrRemoveMember'),
      ...proxyFn('setActiveLeague'),
    },
  },
})
