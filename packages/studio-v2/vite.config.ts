import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Harnais de dev autonome pour itérer sur le studio v2 en HMR, sans la
// friction auth/monorepo de Next. Le package reste consommable par la landing.
// En dev, on proxifie vers le broker prod (comme le rewrite Next en prod), pour
// que le harnais appelle same-origin et que le WS upgrade passe (CORS + WS).
const BROKER = process.env.BROKER_URL || 'https://broker-api.kalit.ai';
export default defineConfig({
  plugins: [react()],
  root: 'dev',
  server: {
    host: '0.0.0.0', port: 5273, allowedHosts: true,
    proxy: {
      '/api/flow': { target: BROKER, changeOrigin: true, ws: true, secure: true },
      '/api/broker': { target: BROKER, changeOrigin: true, ws: true, secure: true,
        rewrite: (p) => p.replace(/^\/api\/broker/, '/api/flow') },
    },
  },
});
