import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Live Server Game State Engine (WebSocket + SSE + HTTP)
function liveGameServerPlugin() {
  return {
    name: 'live-game-server-plugin',
    configureServer(server) {
      // Endpoint 1: High-precision server timestamp sync (eliminates device clock drift)
      server.middlewares.use('/api/server-time', (req, res) => {
        const now = Date.now();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.end(JSON.stringify({ serverTime: now }));
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), liveGameServerPlugin()],
  build: {
    target: 'es2022'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022'
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
