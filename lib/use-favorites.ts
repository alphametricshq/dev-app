"use client";

import { useEffect, useState } from "react";
import { getFavorites, subscribe } from "@/lib/favorites";

export function useFavorites(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => getFavorites());

  useEffect(() => {
    setIds(getFavorites());
    return subscribe(setIds);
  }, []);

  return ids;
}
