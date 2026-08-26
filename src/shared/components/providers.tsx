'use client';
import { ToastProvider } from "@/shared/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
