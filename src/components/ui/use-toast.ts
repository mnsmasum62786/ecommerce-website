"use client";

// Adapted from the shadcn/ui toast hook.
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 4;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type State = { toasts: ToasterToast[] };
const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function dispatch(action: Partial<State> | ((s: State) => State)) {
  memoryState = typeof action === "function" ? action(memoryState) : { ...memoryState, ...action };
  listeners.forEach((l) => l(memoryState));
}

function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch((s) => ({ toasts: s.toasts.filter((t) => t.id !== toastId) }));
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
}

function toast(props: Omit<ToasterToast, "id">) {
  const id = genId();
  const update = (p: ToasterToast) =>
    dispatch((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, ...p } : t)) }));
  const dismiss = () => {
    dispatch((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, open: false } : t)) }));
    addToRemoveQueue(id);
  };

  dispatch((s) => ({
    toasts: [{ ...props, id, open: true, onOpenChange: (open: boolean) => { if (!open) dismiss(); } }, ...s.toasts].slice(0, TOAST_LIMIT),
  }));

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);
  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      dispatch((s) => ({
        toasts: s.toasts.map((t) => (toastId === undefined || t.id === toastId ? { ...t, open: false } : t)),
      }));
    },
  };
}

export { useToast, toast };
