"use client"

import type { ReactNode } from "react"
import { useStudioStore } from "@/stores/studio"
import clsx from "clsx"
import s from "./chat-layout.module.scss"

interface ChatLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  rightPanel?: ReactNode
}

export function ChatLayout({ sidebar, children, rightPanel }: ChatLayoutProps) {
  const { sidebarOpen, rightPanelOpen } = useStudioStore()

  return (
    <div className={s.layout}>
      <aside className={clsx(s.sidebar, sidebarOpen && s.sidebarOpen)}>
        {sidebar}
      </aside>

      <div className={s.backdrop} data-visible={sidebarOpen} onClick={() => useStudioStore.getState().setSidebarOpen(false)} />

      <div className={s.main}>
        {children}
      </div>

      {rightPanel && (
        <aside className={clsx(s.right, rightPanelOpen && s.rightOpen)}>
          {rightPanel}
        </aside>
      )}
    </div>
  )
}
