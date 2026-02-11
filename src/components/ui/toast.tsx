"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  duration?: number;
  tone?: "success" | "error";
  onDismiss?: () => void;
};

const toneClasses: Record<NonNullable<ToastProps["tone"]>, string> = {
  success: "border-emerald-400/40 bg-emerald-500/20 text-emerald-50",
  error: "border-rose-500/40 bg-rose-500/20 text-rose-50",
};

export function Toast({
  message,
  duration = 2200,
  tone = "success",
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (!visible) {
      onDismiss?.();
    }
  }, [onDismiss, visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-full border px-4 py-2 text-sm font-semibold shadow-card transition ${
        toneClasses[tone]
      }`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
