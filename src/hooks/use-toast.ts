import * as React from "react"
import { toast as sonnerToast } from "sonner"

type ToastInput = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
}

function toast({ title, description, variant }: ToastInput) {
  const id = variant === "destructive"
    ? sonnerToast.error(title ?? "Error", {
        description: description ? String(description) : undefined,
      })
    : sonnerToast(title ?? "Notification", {
        description: description ? String(description) : undefined,
      })

  return {
    id: String(id),
    dismiss: () => sonnerToast.dismiss(id),
    update: ({ title: nextTitle, description: nextDescription, variant: nextVariant }: ToastInput) => {
      sonnerToast.dismiss(id)
      toast({
        title: nextTitle ?? title,
        description: nextDescription ?? description,
        variant: nextVariant ?? variant,
      })
    },
  }
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) {
        sonnerToast.dismiss(toastId)
        return
      }
      sonnerToast.dismiss()
    },
  }
}

export { useToast, toast }
