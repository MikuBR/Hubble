'use client';
import { useEffect } from "react";
import { ToastProvider } from "@/shared/ui/Toast";

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  root.classList.add(resolved);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      (localStorage.getItem("hubble-theme") as "light" | "dark" | "system" | null)) || "system";
    applyTheme(stored);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = (localStorage.getItem("hubble-theme") as "light" | "dark" | "system" | null) || "system";
      if (current === "system") applyTheme("system");
    };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  return <ToastProvider>{children}</ToastProvider>;
}
