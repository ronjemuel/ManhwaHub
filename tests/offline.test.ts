import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
test(
  "production service worker installs bounded shell, falls back offline, and never caches remote images",
  { skip: !fs.existsSync("out/sw.js") },
  async () => {
    const script = fs.readFileSync("out/sw.js", "utf8");
    const events: Record<string, Function> = {};
    const maps = new Map<string, Map<string, Response>>();
    const caches = {
      open: async (name: string) => {
        if (!maps.has(name)) maps.set(name, new Map());
        const store = maps.get(name)!;
        return {
          addAll: async (urls: string[]) => {
            for (const u of urls) store.set(u, new Response(u));
          },
          match: async (req: Request | string) =>
            store.get(
              typeof req === "string" ? req : new URL(req.url).pathname,
            ),
          keys: async () => [...store.keys()],
        };
      },
      keys: async () => [...maps.keys()],
      delete: async (n: string) => maps.delete(n),
    };
    vm.runInNewContext(script, {
      self: {
        location: { origin: "https://reader.test" },
        addEventListener: (n: string, f: Function) => (events[n] = f),
        skipWaiting: async () => {},
        clients: { claim: async () => {} },
      },
      caches,
      URL,
      fetch: async () => {
        throw new Error("offline");
      },
    });
    let pending: Promise<unknown>;
    events.install({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending!;
    const shell = [...maps.values()][0];
    assert(shell.has("/index.html"));
    assert(shell.has("/reader/index.html"));
    assert([...shell.keys()].some((x) => x.startsWith("/_next/")));
    assert.equal(
      [...shell.keys()].some((x) => x.startsWith("/demo/")),
      false,
    );
    let response: Promise<Response> | undefined;
    events.fetch({
      request: {
        url: "https://reader.test/reader/?source=demo&id=lantern&chapter=lantern.1",
        method: "GET",
        mode: "navigate",
      },
      respondWith: (p: Promise<Response>) => (response = p),
    });
    assert.equal(await (await response!).text(), "/reader/index.html");
    response = undefined;
    events.fetch({
      request: { url: "https://media.kitsu.app/cover.jpg", method: "GET" },
      respondWith: (p: Promise<Response>) => (response = p),
    });
    assert.equal(response, undefined);
    maps.set("manhwahub-shell-old", new Map());
    events.activate({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending!;
    assert.equal(maps.has("manhwahub-shell-old"), false);
  },
);
