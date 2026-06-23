// components/ui/toaster.tsx
"use client";
import { useToast } from "@/components/ui/use-toast";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-fade-in",
            "bg-white text-gray-900",
            t.variant === "destructive" && "border-red-200   bg-red-50   text-red-900",
            t.variant === "success"     && "border-green-200 bg-green-50 text-green-900",
            t.variant === "default"     && "border-gray-200  bg-white    text-gray-900"
          )}
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            {t.variant === "destructive" && <AlertCircle  className="h-5 w-5 text-red-500"   />}
            {t.variant === "success"     && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {t.variant === "default"     && <Info         className="h-5 w-5 text-blue-500"  />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {t.title && (
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
            )}
            {t.description && (
              <p className="text-sm opacity-80 mt-0.5 leading-snug">{t.description}</p>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
