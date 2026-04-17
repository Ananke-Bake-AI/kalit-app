import { contextBridge, ipcRenderer } from "electron"

type AuthPayload = {
  token: string
  user: {
    id?: string
    email?: string
    name?: string | null
    image?: string | null
    isAdmin?: boolean
  } | null
}

contextBridge.exposeInMainWorld("kalit", {
  openExternal: (url: string) => ipcRenderer.invoke("kalit:open-external", url),
  signOut: () => ipcRenderer.invoke("kalit:sign-out"),
  onAuthToken: (cb: (payload: AuthPayload) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: AuthPayload) => cb(payload)
    ipcRenderer.on("kalit:auth-token", listener)
    return () => ipcRenderer.removeListener("kalit:auth-token", listener)
  },
  platform: process.platform,
})
