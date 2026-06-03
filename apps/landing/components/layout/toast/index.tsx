"use client"

import { Icon } from "@/components/icon"
import { Toaster } from "sonner"
import s from "./toast.module.scss"

export const Toast = () => {
  return (
    <Toaster
      position="top-right"
      icons={{
        success: <Icon icon="hugeicons:checkmark-circle-03" />,
        error: <Icon icon="hugeicons:cancel-circle" />,
        warning: <Icon icon="hugeicons:alert-02" />,
        info: <Icon icon="hugeicons:information-circle" />,
        loading: <Icon icon="svg-spinners:90-ring-with-bg" />
      }}
      duration={6000}
      toastOptions={{
        unstyled: true,
        closeButton: true,
        classNames: {
          toast: s.toast,
          title: s.title,
          description: s.description,
          closeButton: s.close
        }
      }}
    />
  )
}
