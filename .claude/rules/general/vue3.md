# Vue 3 — required idioms

Applies to all components in this project.

## Component shell
- `<script setup lang="ts">` only. **No** Options API. **No** `defineComponent({...})` runtime form.
- Generic components MUST use the Vue 3.3+ syntax:
  ```vue
  <script setup lang="ts" generic="T">
  ```
  Components reusable over an item type are generic over `T`. Do not bypass with `any`.

## Props
- Typed via `defineProps<Props>()`. **Never** the runtime array form (`defineProps(['x'])`).
- Defaults via `withDefaults(defineProps<Props>(), { ... })`.
- Props are read-only. Do not mutate them. Use `defineModel` for two-way bindings.

## Emits
Typed via the tuple syntax:
```ts
const emit = defineEmits<{
  'update:modelValue': [value: T | null];
  select: [option: T];
  open: [];
  close: [];
}>();
```
Never `defineEmits(['select'])`.

## v-model
- Use `defineModel<T | null>()` (Vue 3.4+). Returns a writable ref.
- Do not roll a manual prop+emit pair when `defineModel` works.

## Reactivity gotchas
- `ref` for primitives and most state. `reactive` only for deeply-nested objects you want to bind whole.
- **Never destructure from `reactive()`** — you lose reactivity. Use `toRefs()` if extraction is needed.
- `computed` over `watch` whenever a value is *derivable*. `watch` is for *side effects* in response to a source change.
- `watchEffect` only when sources are implicit and varied; otherwise prefer explicit `watch([sources], cb)`.
- `nextTick` only when the next operation must read DOM that the just-applied state will change.

## Composables
- One concern per composable, one per file: `useAsyncQuery.ts`, `useListNavigation.ts`, `useClickOutside.ts`, etc.
- Pure factories. **No side effects on import.** All side effects (event listeners, timers) inside the composable function body, behind `onMounted` / `onScopeDispose`.
- Return refs and functions. Don't return raw `reactive` objects (the caller can't destructure without losing reactivity).
- Cleanup belongs in `onScopeDispose` so the composable also works inside `effectScope`, not just on unmount.

## Template
- No business logic in the template. Move conditions to `computed`.
- Render discriminated-union state with explicit `v-if` chains (`v-if="state.kind === 'loading'"` etc.). Don't render with overlapping booleans.
- `:key` on `v-for` is the stable identity (e.g. `getValue(item)`), never the array index.

## Banned
- `Vue.set` / `Vue.delete` (Vue 2 leftovers; not exported in 3 anyway).
- Mixins.
- Global registration of one-off components in `main.ts` — register locally.
- `provide` / `inject` for sharing state inside a single component tree we control — use props.
