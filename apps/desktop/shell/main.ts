import { app, BrowserWindow, shell, ipcMain } from "electron"
import path from "node:path"

const PROTOCOL = "kalit"

let mainWindow: BrowserWindow | null = null
let pendingAuthUrl: string | null = null

function registerProtocol() {
  if (process.defaultApp) {
    // When running via `electron .` in dev, we need to pass the argv to register.
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Kalit Studio",
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0b0d10",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools({ mode: "detach" })
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))
  }

  mainWindow.webContents.on("did-finish-load", () => {
    if (pendingAuthUrl) {
      deliverAuthUrl(pendingAuthUrl)
      pendingAuthUrl = null
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function parseAuthCallback(url: string): { token?: string; user?: unknown } | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== `${PROTOCOL}:`) return null
    // Accept kalit://auth/callback?... or kalit://auth?... — both sensible shapes
    const token = parsed.searchParams.get("token")
    const userRaw = parsed.searchParams.get("user")
    if (!token) return null
    const user = userRaw ? JSON.parse(userRaw) : null
    return { token, user }
  } catch {
    return null
  }
}

function deliverAuthUrl(url: string) {
  const payload = parseAuthCallback(url)
  if (!payload || !mainWindow) return
  mainWindow.webContents.send("kalit:auth-token", payload)
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

function handleAuthUrl(url: string) {
  if (mainWindow?.webContents && !mainWindow.webContents.isLoading()) {
    deliverAuthUrl(url)
  } else {
    pendingAuthUrl = url
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  registerProtocol()

  app.on("second-instance", (_event, argv) => {
    // Win/Linux: deep link arrives as a command-line arg on the second instance
    const url = argv.find((a) => a.startsWith(`${PROTOCOL}://`))
    if (url) handleAuthUrl(url)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.on("open-url", (event, url) => {
    // macOS: deep link arrives as an open-url event
    event.preventDefault()
    handleAuthUrl(url)
  })

  app.whenReady().then(() => {
    createWindow()
    // If launched with the deep-link arg directly (Win/Linux cold start)
    const initialUrl = process.argv.find((a) => a.startsWith(`${PROTOCOL}://`))
    if (initialUrl) pendingAuthUrl = initialUrl
  })

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

ipcMain.handle("kalit:open-external", async (_e, url: string) => {
  await shell.openExternal(url)
})

ipcMain.handle("kalit:sign-out", async () => {
  // Placeholder — token clearing happens in the renderer. Future: wipe OS keychain entry.
  return true
})
