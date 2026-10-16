"use client";
import { useEffect, useState } from "react";
import { registry } from "@/sources/registry";
import type { SearchQuery } from "@/sources/types";
import { useApp } from "@/components/app-context";
export function useCatalog(query: SearchQuery, source = "all") {
  const { data, ready } = useApp();
  const [result, setResult] = useState<
    Awaited<ReturnType<typeof registry.search>>
  >({
    items: [],
    hasNextPage: false,
    errors: [],
    notices: [],
    noSources: false,
  });
  const [loading, setLoading] = useState(true),
    [nonce, setNonce] = useState(0);
  const signature = JSON.stringify({
    query,
    source,
    enabled: data.settings.enabledSources,
    allowed: data.settings.allowedRatings,
    languages: data.settings.languages,
    blocked: data.settings.blockedGenres,
  });
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      registry
        .search(query, data.settings, source)
        .then((r) => {
          if (alive) setResult(r);
        })
        .catch((e) => {
          if (alive)
            setResult({
              items: [],
              hasNextPage: false,
              errors: [String(e)],
              notices: [],
              noSources: false,
            });
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [signature, ready, nonce]); // Primitive signature intentionally tracks query and content policy only.
  return { ...result, loading, retry: () => setNonce((n) => n + 1) };
}
