# Async search — required pattern

These rules apply to **any component that fires an asynchronous query in response to user input** — search-as-you-type, autocomplete, async-loaded select, infinite-scroll search, etc.

## The bug naive AI output gets wrong

> **AbortController alone is NOT sufficient to handle out-of-order responses.**
>
> 1. A custom loader may not honor the `AbortSignal` (third-party fetcher, cached promise, mocked test loader).
> 2. There is a race between calling `controller.abort()` and the in-flight resolve handler.
> 3. Some fetch wrappers swallow `AbortError` and resolve normally with a partial result.
>
> Always pair `AbortController` with a **monotonic request-ID guard** that the resolver checks before mutating state.

If a review finds a `loader` call that mutates state after `await` without checking a sequence ID, that's a defect — flag it.

## Required pattern

Debouncing uses `lodash-es`'s `debounce`. See `architecture/dependencies.md`.

```ts
import { onScopeDispose, ref, shallowRef } from 'vue';
import { debounce } from 'lodash-es';

export type Loader<T> = (query: string, signal: AbortSignal) => Promise<T[]>;

export type QueryState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; error: Error }
  | { kind: 'ready'; items: T[] };

export function useAsyncQuery<T>(
  loader: Loader<T>,
  opts: { debounceMs?: number; loadOnEmpty?: boolean; minQueryLength?: number } = {},
) {
  const debounceMs = opts.debounceMs ?? 250;
  const loadOnEmpty = opts.loadOnEmpty ?? false;
  const minQueryLength = opts.minQueryLength ?? 0;

  const state = shallowRef<QueryState<T>>({ kind: 'idle' });
  const seq = ref(0);
  let controller: AbortController | null = null;

  async function execute(query: string): Promise<void> {
    const id = ++seq.value;
    if (controller !== null) controller.abort();
    controller = new AbortController();
    state.value = { kind: 'loading' };
    try {
      const items = await loader(query, controller.signal);
      if (id !== seq.value) return;                       // a newer call superseded us
      state.value = { kind: 'ready', items };
    } catch (e) {
      if (id !== seq.value) return;                       // stale rejection
      if (e instanceof DOMException && e.name === 'AbortError') return;
      state.value = {
        kind: 'error',
        error: e instanceof Error ? e : new Error(String(e)),
      };
    }
  }

  const debouncedExecute = debounce(execute, debounceMs);

  function cancel(): void {
    debouncedExecute.cancel();
    if (controller !== null) {
      controller.abort();
      controller = null;
    }
  }

  function run(query: string): void {
    if (!loadOnEmpty && query === '') {
      cancel();
      state.value = { kind: 'idle' };
      return;
    }
    if (query.length < minQueryLength) {
      cancel();
      state.value = { kind: 'idle' };
      return;
    }
    debouncedExecute(query);
  }

  onScopeDispose(cancel);

  return { state, run, cancel };
}
```

## Why every line matters
- `++seq.value` is captured **synchronously** before the `await`, so older in-flight calls see they're stale.
- `if (id !== seq.value) return` runs in **both** the resolve and reject paths — a stale request can fail too.
- `AbortError` swallowed silently; other errors surface.
- `cancel()` covers the debounced call **and** the controller — pending calls that haven't fired yet must also be cancellable.
- `debouncedExecute.cancel()` (lodash's API) is what makes pending calls cancellable; do not roll your own.
- `onScopeDispose(cancel)` works inside `effectScope` and on unmount.

## IME / composition
Don't fire the query during IME composition. Gate the `run()` call with a `composing` ref toggled by `compositionstart` / `compositionend`. See `form-inputs.md`.

## Empty query
- Default: do not call `loader('')`. State goes to `idle`.
- Override via `loadOnEmpty: true` (e.g. show a "recent searches" list on focus).

## Min query length
- Default 0. If `minQueryLength = 2`, queries shorter than 2 chars set state to `idle` without firing the loader.

## Sync mode (when applicable)
A component supporting both sync `T[]` and async `loader` routes through synchronous filtering when sync, skipping `useAsyncQuery` entirely. Pick the mode by which prop is set; emit a dev-mode warning if both are passed.

## Banned
- ❌ Inline `setTimeout` / `clearTimeout` for debouncing (in component or composable). Use `lodash-es` `debounce`. See `architecture/dependencies.md`.
- ❌ Calling the loader inside a `watch(() => query, ...)` without debounce + sequence guard.
- ❌ Storing the in-flight controller on `window` or a module-global.
- ❌ `Promise.race([loader(), timeout])` to "fix" out-of-order — different bug, wrong fix.
- ❌ Catching all errors silently. Surface non-AbortError errors to `state.error`; render the error region.
