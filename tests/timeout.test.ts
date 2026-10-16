import test from "node:test";
import assert from "node:assert/strict";
import { SourceRegistry } from "../src/sources/registry";
import { createDemoSource } from "../src/sources/mock";
import { defaultSettings } from "../src/types";
test("provider timeout aborts the request and reports unavailable", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const base = createDemoSource("slow");
  let signal: AbortSignal | undefined;
  const r = new SourceRegistry([
    {
      ...base,
      search: async (_q, c) => {
        signal = c.signal;
        return new Promise(() => {});
      },
    },
  ]);
  const p = r.call(
    "slow",
    { ...defaultSettings, enabledSources: ["slow"] },
    (s, c) => s.search({ page: 1 }, c),
  );
  const assertion = assert.rejects(p, /too long/);
  t.mock.timers.tick(12001);
  await assertion;
  assert.equal(signal?.aborted, true);
  assert.equal(r.status("slow").state, "unavailable");
  t.mock.timers.reset();
});
