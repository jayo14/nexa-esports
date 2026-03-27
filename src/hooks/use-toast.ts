import * as React from "react"
import { toast as sonnerToast } from "sonner"

type ToastInput = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  duration?: number
}

function toast({ title, description, variant, duration }: ToastInput) {
  // Ensure title is a renderable string/node to prevent Error #31
  const sanitizedTitle = typeof title === 'object' && title !== null && !React.isValidElement(title)
    ? (title as any).title ?? JSON.stringify(title)
    : title;

  const options = {
    description: description ? String(description) : undefined,
    duration: duration,
  };

  const id = variant === "destructive"
    ? sonnerToast.error(sanitizedTitle ?? "Error", options)
    : sonnerToast(sanitizedTitle ?? "Notification", options)

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
