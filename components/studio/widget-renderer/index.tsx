"use client"

import { ProjectWidget, ResearchWidget, TaskWidget, HotfixWidget, RespawnWidget } from "@/components/studio/widgets"

interface WidgetRendererProps {
  widgetType: string
  widgetId: string
  messageCreatedAt?: string
  onCompleted?: () => void
  onPreviewFile?: (file: { url: string; name: string }) => void
}

export function WidgetRenderer({
  widgetType,
  widgetId,
  messageCreatedAt,
  onCompleted,
  onPreviewFile,
}: WidgetRendererProps) {
  switch (widgetType) {
    case "project":
      return <ProjectWidget projectId={widgetId} onCompleted={onCompleted} />
    case "research":
    case "find-assets":
      return <ResearchWidget researchId={widgetId} onCompleted={onCompleted} onPreviewFile={onPreviewFile} />
    case "task":
    case "sub-agent":
      return <TaskWidget taskId={widgetId} onCompleted={onCompleted} />
    case "hotfix":
      return <HotfixWidget projectId={widgetId} onCompleted={onCompleted} />
    case "respawn":
      return <RespawnWidget widgetId={widgetId} messageCreatedAt={messageCreatedAt} onCompleted={onCompleted} />
    default:
      return null
  }
}
