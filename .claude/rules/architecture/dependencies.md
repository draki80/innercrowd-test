# Dependency choices

## Utility library
- **Use `lodash-es`** for `debounce`, `throttle`, and the few utilities native JS doesn't cover well (e.g. `isEqual` for deep comparison). Import named exports for tree-shaking:
  ```ts
  import { debounce } from 'lodash-es';
  ```
  **Never** import the full `lodash` package — it doesn't tree-shake and pulls in the entire 70KB stdlib regardless of what you use.

- **Don't use lodash for** things native JS does well: array methods (`map`, `filter`, `reduce`, `find`), object spread, optional chaining, nullish coalescing, `structuredClone`. The library exists for cases where the native equivalent is awkward or subtly wrong (debounce timing semantics, deep equality on cross-realm objects).

## Debouncing — required pattern
**All debounce uses go through `lodash-es`'s `debounce`.** Inline `setTimeout` + `clearTimeout` debouncing is banned.

Reasons:
- Battle-tested timing semantics (leading / trailing / `maxWait`).
- Built-in `.cancel()` and `.flush()` simplify cleanup and testing.
- TypeScript signatures preserve the wrapped function's argument and return types.

```ts
// ✅ correct
import { debounce } from 'lodash-es';
import { onScopeDispose } from 'vue';

const debouncedRun = debounce((q: string) => actuallyRun(q), 250);
onScopeDispose(() => debouncedRun.cancel());
```

```ts
// ❌ banned
let timer: ReturnType<typeof setTimeout> | null = null;
function debouncedRun(q: string) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => actuallyRun(q), 250);
}
```

`lodash.debounce` also plays cleanly with Vitest fake timers — `vi.useFakeTimers()` in Vitest 3 fakes `Date` by default, which lodash's internal time-tracking relies on.

## Adding a new dependency
Before adding a runtime dep, ask:
1. Does native JS / TS / Vue / Pinia / `lodash-es` already do this?
2. What's the install size? Reject anything > 50KB minified without a strong reason.
3. Is it actively maintained (last release < 12 months, issues triaged)?
4. Does it pull in transitive deps that bloat the bundle?

Devdeps have a much lower bar — they don't ship to users.
