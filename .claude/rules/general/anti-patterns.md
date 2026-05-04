# Anti-patterns — concrete don'ts

Each entry: ❌ pattern → ✅ replacement → *why*.

## Vue / reactivity

- ❌ `watch(() => props.options, () => filtered.value = filter(props.options))`
  ✅ `const filtered = computed(() => filter(props.options, query.value))`
  *Derivation is not a side effect. `computed` is cached, lazy, and self-cleaning.*

- ❌ Mutating `props.modelValue` directly
  ✅ `defineModel<T | null>()` or `emit('update:modelValue', x)`
  *Props are one-way. Mutation breaks the parent's source-of-truth contract.*

- ❌ Destructuring `reactive()`: `const { items } = reactive({ items: [] })`
  ✅ `const items = ref<T[]>([])` or `const r = reactive({...}); const { items } = toRefs(r)`
  *Destructuring breaks reactivity — the bindings aren't tracked.*

- ❌ `defineProps(['x'])` (runtime array form)
  ✅ `defineProps<{ x: string }>()`
  *Runtime form drops type info; defeats the point of TS.*

## TypeScript

- ❌ `as any` to silence a type error
  ✅ Narrow with a type guard, or fix the type
  *`as any` is how real bugs reach production. Each one is technical debt.*

- ❌ Non-null assertion: `getValue(item!)`
  ✅ `if (!item) return; getValue(item)` or refine the upstream type
  *`!` lies to the type checker. Use it and you'll get a runtime null at the worst time.*

- ❌ Stringly-typed emit: `emit('select', item)`
  ✅ `defineEmits<{ select: [item: T] }>()` and then `emit('select', item)` (now type-checked)
  *Typed emits catch typos at build time and document the public surface.*

## Async

- ❌ Calling the loader on every keystroke
  ✅ Debounce + cancel + sequence-ID guard (see `frontend-components/async-search.md`)
  *Wastes network, races, and floods the user with stale results.*

- ❌ AbortController without a sequence-ID guard
  ✅ Both — the guard catches what abort can't (see `frontend-components/async-search.md`)
  *Aborted promises can still settle. Naive AI output gets this wrong consistently.*

- ❌ Inline `setTimeout` / `clearTimeout` for debouncing (in component or composable)
  ✅ `import { debounce } from 'lodash-es'`; cancel via `.cancel()` in `onScopeDispose`
  *Hand-rolled timers leak across HMR, get edge cases wrong (leading/trailing/maxWait), and don't compose. See `architecture/dependencies.md`.*

- ❌ Catching all errors silently in the loader
  ✅ Surface non-AbortError errors to `state.error`; render the error region
  *Silent failures are the #1 source of "the dropdown is just empty and I have no idea why" bugs.*

## Accessibility

- ❌ Click handler on `<li role="option">`: `@click="select"`
  ✅ `@mousedown.prevent="select"`
  *`click` fires after `blur`. The dropdown closes on blur, so click never reaches the option. `mousedown` fires before, with `preventDefault` to retain input focus.*

- ❌ Calling `.focus()` on the highlighted option in a combobox
  ✅ Move highlight via `aria-activedescendant`; focus stays on the input
  *Moving DOM focus breaks the combobox APG pattern and confuses screen readers.*

- ❌ `<div role="combobox">` styled to look like an input
  ✅ Use a real `<input>` and style it
  *You drop ~30 native a11y behaviors (selection, IME, password managers, autofill).*

- ❌ Removing focus outline (`outline: none`) without replacement
  ✅ Style a visible `:focus-visible` ring
  *Keyboard users need to see what's focused.*

- ❌ `v-html` for option labels (e.g. bolding the matched substring)
  ✅ Slot, with the consumer responsible for any rich rendering they opt into; default escapes
  *XSS surface. Default to safe rendering.*

## Project hygiene

- ❌ Adding a UI library (Headless UI, PrimeVue, Vuetify, Radix-Vue) "to save time"
  ✅ Build the component to spec
  *The deliverable is the component itself; a UI-library wrapper is a different deliverable.*

- ❌ Reaching for a state manager for component-local state
  ✅ `ref` / `reactive` inside the component — see `architecture/state-management.md`
  *Pinia is for cross-cutting state. Component-local state doesn't have that problem.*

- ❌ Storing transient UI state (open/close, highlight) in URL / localStorage
  ✅ Component-local
  *Ephemeral UI state in persistent stores leads to bad reload behavior.*

- ❌ Hardcoding `.id` / `.label` / `.name` keys on the item type
  ✅ Consumer-passed `getValue` / `getLabel` accessors
  *Reusability is the point. Different APIs return different shapes.*

- ❌ Global `window.addEventListener` without cleanup
  ✅ `onMounted(() => window.addEventListener(...)); onBeforeUnmount(() => ...)` or composable
  *HMR re-runs setup; without cleanup, listeners pile up and old handlers fire.*

- ❌ Importing the full `lodash` package
  ✅ `import { debounce } from 'lodash-es'`
  *`lodash-es` tree-shakes; `lodash` does not. Saves ~70KB minified.*
