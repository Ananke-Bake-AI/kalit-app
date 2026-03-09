import { env } from "@/env"

export const APP_NAME = "Next 16 Starter"

export const APP_COLOR_PRIMARY = "rgb(27, 26, 22)"
export const APP_COLOR_SECONDARY = "#ffffff"
export const APP_THEME_COLOR = APP_COLOR_PRIMARY

export const APP_BASE_URL =
  env.NEXT_PUBLIC_NODE_ENV === "production"
    ? new URL(env.NEXT_PUBLIC_BASE_URL)
    : new URL("http://localhost:3000")
