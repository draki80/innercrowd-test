---
description: Review async code for race-condition safety and cancellation
argument-hint: [path-to-file]
---

Review async loader code in `$ARGUMENTS` (or, if no argument given, all `src/**/useAsync*.ts`) against the rules in `.claude/rules/frontend-components/async-search.md`.

Check each `async function` and each `loader(...)` call site for:

1. **Debounce on input.** Inputs that trigger the loader pass through `setTimeout` / a debounce composable, not direct invocation.
2. **AbortController per call.** Each `loader(query, signal)` invocation receives a fresh `AbortController().signal`, and the previous controller is aborted before the new call.
3. **Monotonic request-ID guard.** A `seq` ref incremented before `await`. Both resolve and reject paths check `if (id !== seq.value) return` before mutating state. **This is the rule naive AI most often misses — flag it specifically and loudly.**
4. **AbortError silent.** `if (e instanceof DOMException && e.name === 'AbortError') return` — aborts don't surface as user-visible errors.
5. **Real errors surface.** Non-AbortError errors set `state.error` (or equivalent).
6. **Cancellation on unmount.** `onScopeDispose(cancel)` or `onBeforeUnmount(cancel)` — outstanding timer + controller both cancelled.
7. **Empty-query short-circuit.** Empty query (when `loadOnEmpty` is false) sets state to `idle` without calling the loader.
8. **IME composition gate.** Query handler does not fire while `compositionstart` / `compositionend` indicate IME is active.

Output a table: **#**, **Check**, **Status** (PASS / FAIL / N/A), **Where** (file:line). Findings section beneath with one-line fixes for each FAIL.

Pay particular attention to: any `async` function that mutates a shared state ref **after** an `await` without guarding for staleness — that's the bug.

End with a verdict: `<n> FAIL / <m> PASS — <safe to ship | race condition present>`.
