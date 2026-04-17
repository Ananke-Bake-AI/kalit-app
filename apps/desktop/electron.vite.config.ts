import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import react from "@vitejs/plugin-react"

const BROKER_TARGET = process.env.VITE_BROKER_URL || "http://localhost:9000"

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: "shell/main.ts",
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: "shell/preload.ts",
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [react()],
    define: {
      // @kalit/studio-ui reads `process.env.SUITE_*` for default suite URLs.
      // Those are inlined by Next on the web; stub here so the browser bundle
      // doesn't trip on `process`.
      "process.env": "{}",
    },
    server: {
      proxy: {
        "/api/broker": {
          target: BROKER_TARGET,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/broker/, "/api/flow"),
        },
      },
    },
    build: {
      rollupOptions: {
        input: "index.html",
      },
    },
  },
})
