import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "ai.kalit.studio",
  appName: "Kalit Studio",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  ios: {
    scheme: "Kalit Studio",
  },
}

export default config
