"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";

export function useSupabaseInit() {
  const loadFromSupabase = useWorkspaceStore((s) => s.loadFromSupabase);

  useEffect(() => {
    if (isSupabaseConfigured) {
      loadFromSupabase();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
