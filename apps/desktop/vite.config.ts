import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

const BROKER_TARGET = process.env.VITE_BROKER_URL || "http://localhost:9000"

export default defineConfig({
  plugins: [react()],
  define: {
    // @kalit/studio-ui reads `process.env.SUITE_*` for default suite URLs.
    // Those are inlined by Next on the web; stub here so the bundler doesn't
    // trip on `process` in a browser context.
    "process.env": "{}",
  },
  server: {
    port: 5173,
    proxy: {
      "/api/broker": {
        target: BROKER_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/broker/, "/api/flow"),
      },
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
})
