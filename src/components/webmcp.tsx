"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
export function WebMCP() {
  const router = useRouter();
  useEffect(() => {
    type Context = {
      registerTool: (
        tool: unknown,
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const schema = z.object({ query: z.string().min(1).max(200) }).strict();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "open_manga_search",
            title: "Search ManhwaHub",
            description:
              "Open the Browse screen with a title query. Applies the current enabled sources and content preferences. Does not add titles to the library.",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", minLength: 1, maxLength: 200 },
              },
              required: ["query"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: async (input: unknown) => {
              const { query } = schema.parse(input);
              const url = `/browse/?q=${encodeURIComponent(query)}`;
              router.push(url);
              const deadline = Date.now() + 5000;
              while (Date.now() < deadline) {
                const field = document.querySelector<HTMLInputElement>(
                  'input[aria-label="Search titles"]',
                );
                if (location.pathname === "/browse/" && field?.value === query)
                  return { opened: url, query };
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
              throw new Error(
                "Search navigation did not complete. Please open Browse and try again.",
              );
            },
          },
          { signal: life.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => life.abort();
  }, [router]);
  return null;
}
