---
description: Scaffold a Vue 3 + TS component following project conventions
argument-hint: <ComponentName>
---

Scaffold a new Vue 3 component named `$ARGUMENTS` following this project's conventions. Substitute the name everywhere below.

Before scaffolding, **decide which component-class rule files apply** based on what the component does:

- Form/input behavior → `.claude/rules/frontend-components/form-inputs.md`
- Opens floating content (menu, listbox, dropdown, dialog) → `.claude/rules/frontend-components/menus-and-popovers.md`
- Combobox specifically (input + listbox) → `.claude/rules/frontend-components/combobox.md`
- Loads results asynchronously on user input → `.claude/rules/frontend-components/async-search.md`

Read the applicable files. Don't improvise patterns the rules already specify.

Create:

1. `src/lib/$ARGUMENTS/$ARGUMENTS.vue`
   - `<script setup lang="ts" generic="T">` if the component is generic over an item type.
   - `defineProps<...>()` typed (no runtime array form).
   - `defineModel<T | null>()` for v-model.
   - `defineEmits<{...}>()` typed tuple syntax.
   - Discriminated-union state (`{ kind: 'idle' | 'loading' | 'error' | 'ready' }`) rendered with explicit `v-if` chains, if applicable.
   - ARIA structure per the relevant component-class rule file.

2. Composables (one file each, named `use*.ts`):
   - `useAsyncQuery.ts` if the component does async search — implement the **exact** pattern in `frontend-components/async-search.md` (debounce + AbortController + monotonic sequence-ID guard). Do not skip the sequence-ID guard.
   - `useListNavigation.ts` if the component has keyboard-navigated list items.
   - `useClickOutside.ts` if the component opens floating content — `pointerdown` + `composedPath`, registered in `onMounted`, removed in `onBeforeUnmount`.

3. `src/lib/$ARGUMENTS/types.ts`
   - Export the component's public types (props, state shape, callback signatures).

4. `src/lib/$ARGUMENTS/index.ts`
   - Barrel re-export: `export { default as $ARGUMENTS } from './$ARGUMENTS.vue'` and `export type { ... } from './types'`.

5. **Add the component to the public library entry** at `src/lib/index.ts`:
   - `export { $ARGUMENTS } from './$ARGUMENTS';`
   - Re-export any public types.

6. `src/lib/$ARGUMENTS/$ARGUMENTS.spec.ts`
   - Skeleton with `describe('$ARGUMENTS', ...)` and one `it.todo` for each test required by the component-class rule files (e.g. combobox tests in `general/testing.md`, async-search tests in `general/testing.md`).

7. `src/lib/$ARGUMENTS/$ARGUMENTS.stories.ts`
   - Storybook story with at least one variant per applicable mode (sync, async, error, etc.).
   - Use the loose-meta pattern (`Meta` without `<typeof Component>`) since SFCs with `generic="T"` don't infer cleanly through Storybook's typeof.
   - Set `tags: ['autodocs']` so the props table populates automatically.

After writing, run `npm run type-check` and report any errors. Do not run the test suite (the spec stubs aren't filled in yet).

Reference: read `.claude/rules/general/vue3.md`, `.claude/rules/general/typescript.md`, and the applicable component-class files. Do not invent patterns the rules already specify.
