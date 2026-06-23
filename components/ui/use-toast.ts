// components/ui/use-toast.ts
"use client";
import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 4000;

type ToastVariant = "default" | "destructive" | "success";

export interface Toast {
  id:          string;
  title?:      string;
  description?: string;
  variant?:    ToastVariant;
  duration?:   number;
}

type ToastAction =
  | { type: "ADD_TOAST";    toast: Toast }
  | { type: "REMOVE_TOAST"; toastId: string }
  | { type: "DISMISS_TOAST"; toastId?: string };

interface ToastState {
  toasts: Toast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return { toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "REMOVE_TOAST":
      return { toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        return { toasts: state.toasts.filter((t) => t.id !== toastId) };
      }
      return { toasts: [] };
    }
  }
}

const listeners: ((state: ToastState) => void)[] = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

export function toast({
  title,
  description,
  variant = "default",
  duration = TOAST_REMOVE_DELAY,
}: Omit<Toast, "id">) {
  const id = genId();
  dispatch({ type: "ADD_TOAST", toast: { id, title, description, variant, duration } });

  const timeout = setTimeout(() => {
    dispatch({ type: "REMOVE_TOAST", toastId: id });
    toastTimeouts.delete(id);
  }, duration);

  toastTimeouts.set(id, timeout);
  return id;
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    toasts:  state.toasts,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}
