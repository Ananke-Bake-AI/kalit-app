import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Harnais de dev autonome pour itérer sur le studio v2 en HMR, sans la
// friction auth/monorepo de Next. Le package reste consommable par la landing.
export default defineConfig({
  plugins: [react()],
  root: 'dev',
  server: { host: '0.0.0.0', port: 5273, allowedHosts: true },
});
