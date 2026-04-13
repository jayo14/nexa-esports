import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

// Compatibility shim: accepts shadcn/ui-style { title, description, variant }
// objects as well as sonner's native string-first signature.
type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  [key: string]: unknown;
};

function toast(titleOrOptions: string | ToastOptions, options?: object) {
  if (typeof titleOrOptions === "object" && titleOrOptions !== null) {
    const { title = "", description, variant, ...rest } = titleOrOptions;
    const sonnerOpts = { description, ...rest };
    if (variant === "destructive") {
      return sonnerToast.error(title, sonnerOpts);
    }
    return sonnerToast(title, sonnerOpts);
  }
  // Native sonner call: toast("message") or toast("message", { description })
  return sonnerToast(titleOrOptions, options as Parameters<typeof sonnerToast>[1]);
}

// Forward all sonner sub-methods (toast.success, toast.error, etc.)
toast.success = sonnerToast.success;
toast.error = sonnerToast.error;
toast.info = sonnerToast.info;
toast.warning = sonnerToast.warning;
toast.loading = sonnerToast.loading;
toast.dismiss = sonnerToast.dismiss;
toast.promise = sonnerToast.promise;
toast.custom = sonnerToast.custom;
toast.message = sonnerToast.message;

export { Toaster, toast }

