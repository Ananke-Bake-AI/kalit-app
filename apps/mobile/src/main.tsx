import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./broker"
import "./styles/globals.scss"

import { App } from "./App"

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("#root element missing")

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
