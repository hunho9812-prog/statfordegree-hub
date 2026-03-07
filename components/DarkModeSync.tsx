"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/lib/store";

export default function DarkModeSync() {
  const darkMode = useWorkspaceStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return null;
}
