import { create } from "zustand"

import type { AppPageState } from "@/lib/suites"

export type { AppPageState } from "@/lib/suites"

interface AppStore {
  nav: boolean
  setNav: (nav: boolean) => void
  page: AppPageState
  setPage: (page: AppPageState) => void
  subOpen: boolean
  setSubOpen: (subOpen: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  nav: false,
  setNav: (nav) => set({ nav }),
  page: "default",
  setPage: (page) => set({ page }),
  subOpen: false,
  setSubOpen: (subOpen) => set({ subOpen })
}))
