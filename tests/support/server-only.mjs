// Test-only: lets plain Node render server components that import "server-only"
// (the real guard is enforced by Next.js builds). Used by homepage-reference.test.ts.
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: new URL("../../node_modules/server-only/empty.js", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
