"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  duration?: number;
};

export function Toast({ message, duration = 2200 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-brand-charcoal shadow-card">
      {message}
    </div>
  );
}
