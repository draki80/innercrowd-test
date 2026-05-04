# Testing — Vitest + @vue/test-utils + happy-dom

## Stack pin
- **Vitest** as the runner.
- **@vue/test-utils** for component mounting.
- **happy-dom** as the DOM environment (faster than jsdom for component tests).
- File pattern: `*.spec.ts` colocated with the source it tests.

## Behavior-first
Assert what a user (or assistive tech) sees and what events the component emits. **Do not** assert on `wrapper.vm.someRef.value` — that ties tests to internal implementation and breaks on refactor.

## Role queries
Prefer role-based queries:

```ts
const input = wrapper.get('[role="combobox"]');
const listbox = wrapper.get('[role="listbox"]');
const options = wrapper.findAll('[role="option"]');
```

VTU doesn't ship Testing-Library's `getByRole` natively; selector strings as above are fine.

## Required tests for combobox-style components
Any component implementing the combobox pattern (see `frontend-components/combobox.md`) MUST have tests for:

1. Renders combobox with correct ARIA attributes (role, aria-expanded false initially, aria-controls).
2. Opens on ArrowDown — aria-expanded becomes true, listbox visible, first option highlighted via aria-activedescendant.
3. Filters as the user types (sync mode).
4. Selects via Enter — emits `update:modelValue` with the highlighted item.
5. Selects via mousedown — emits, dropdown closes.
6. Closes on Escape — input value reverts to selected label.
7. Closes on click outside (pointerdown elsewhere on document).
8. Tab closes without selecting.
9. Focus stays on the input during keyboard navigation.

## Required tests for async-search components
Any component that loads results asynchronously (see `frontend-components/async-search.md`) MUST have tests for:

10. Debounces the loader — typing 5 keys quickly fires the loader once after `debounceMs`.
11. **Drops out-of-order responses** — resolve query 1 *after* query 2; assert query 2's results win, query 1's are dropped. **This is the highest-leverage test.**
12. Renders idle / loading / error / ready states distinctly.
13. Cancels in-flight requests on unmount.

## Out-of-order test pattern

```ts
function defer<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

it('drops out-of-order responses', async () => {
  vi.useFakeTimers();
  const d1 = defer<Item[]>();
  const d2 = defer<Item[]>();
  const loader = vi.fn()
    .mockImplementationOnce(() => d1.promise)
    .mockImplementationOnce(() => d2.promise);

  const wrapper = mount(MyComponent, { props: { loader, getValue, getLabel, modelValue: null } });
  const input = wrapper.get('[role="combobox"]');

  await input.setValue('a');
  await vi.advanceTimersByTimeAsync(250);     // fires loader for "a"
  await input.setValue('ab');
  await vi.advanceTimersByTimeAsync(250);     // fires loader for "ab"

  d2.resolve([{ id: 2, label: 'B-result' }]); // fast (correct) response
  await flushPromises();
  d1.resolve([{ id: 1, label: 'A-result' }]); // slow (stale) response — must be dropped
  await flushPromises();

  const labels = wrapper.findAll('[role="option"]').map(o => o.text());
  expect(labels).toEqual(['B-result']);       // never includes A-result
});
```

## Debounce tests
Use `vi.useFakeTimers()` in `beforeEach`, advance with `vi.advanceTimersByTimeAsync(ms)`. Call `vi.useRealTimers()` in `afterEach` if other tests in the file are real-time.

## Keyboard tests
```ts
await input.trigger('keydown', { key: 'ArrowDown' });
expect(input.attributes('aria-activedescendant')).toBe('option-0');
```
Use `key`, not `keyCode` (deprecated and inconsistent across browsers).

## Click-outside test
Render into `document.body` (`attachTo: document.body`), dispatch `pointerdown` at the body, assert popover closed.

## Banned
- ❌ Full-DOM snapshots — brittle, no signal.
- ❌ `wrapper.vm.$emit(...)` in tests — emit from the actual user interaction.
- ❌ Mocking Vue internals (`vi.mock('vue', ...)`) — there's never a good reason in this project.
- ❌ Asserting on CSS classes for behavior — assert on roles, attributes, emitted events.
- ❌ Tests that pass with the implementation deleted. If `it.skip` or no assertions, the test is a lie.
