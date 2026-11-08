"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "./api";

export function useJson(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { ok, data: json } = await fetchJson(url);
    if (!ok) {
      setError("Не удалось загрузить данные");
      return null;
    }
    setData(json);
    setError("");
    return json;
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, load };
}
