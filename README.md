# SearchableSelect

A reusable, accessible, generic `<SearchableSelect<T>>` component for Vue 3, plus the AI tool configuration that steered the build.

The component lives at `src/lib/SearchableSelect/`. The demo at `src/demo/App.vue` exercises it in four configurations — sync, async, a race-condition stress test, and an error-state demo.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

| Command                 | What it does                                |
|-------------------------|---------------------------------------------|
| `npm run type-check`     | `vue-tsc --noEmit` against `tsconfig.app.json` |
| `npm run build`          | type-check + production build to `dist/`    |
| `npm run preview`        | serve the built `dist/`                     |
| `npm run test`           | Vitest watch mode                           |
| `npm run test:run`       | Vitest single run                           |
| `npm run storybook`      | Storybook dev on http://localhost:6006      |
| `npm run build-storybook`| Static Storybook build to `storybook-static/` |

---

## Stack

- **Vue 3.5+** (`<script setup lang="ts" generic="T">`)
- **TypeScript 5.6** strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Vite 6** + **Vitest 3** + **@vue/test-utils** + **happy-dom**
- **Pinia** for cross-cutting state (selections, API actions). Component-local state for interaction concerns.
- **lodash-es** for `debounce` (the only utility from the stdlib used here).
- **Custom CSS only.** No Tailwind, no UI kit, no combobox library.

---

## Project layout

```
test1/
├── src/
│   ├── lib/                            # the component library (public API: lib/index.ts)
│   │   ├── index.ts                    # re-exports the public surface
│   │   └── SearchableSelect/
│   │       ├── SearchableSelect.vue
│   │       ├── SearchableSelect.stories.ts  # Storybook stories
│   │       ├── useAsyncQuery.ts        # debounce + abort + sequence-ID guard
│   │       ├── useListNavigation.ts    # highlight index + keyboard helpers
│   │       ├── useClickOutside.ts      # pointerdown + composedPath
│   │       ├── types.ts
│   │       └── index.ts                # component-level barrel
│   ├── api/                            # plain async functions, no reactivity
│   │   ├── users.ts                    # mock API with configurable latency / fail
│   │   └── countries.ts                # static list
│   ├── stores/                         # Pinia stores (setup syntax)
│   │   ├── users.ts
│   │   └── countries.ts
│   ├── demo/App.vue                    # 4-configuration demo (consumer of lib/)
│   └── main.ts
├── .storybook/                         # Storybook config (Vue 3 + Vite, a11y addon)
│   ├── main.ts
│   └── preview.ts
├── .claude/                            # AI tool configuration (see below)
├── CLAUDE.md                           # always-loaded project context
└── package.json
```

`src/lib/` is the **component library**. Components live there because the project ships them as a reusable surface — `src/lib/index.ts` is the public entry, mirroring how a published package would expose its API. Anything outside `lib/` (`demo/`, `api/`, `stores/`) is consumer code.

---

## Component library & Storybook

Each component in `src/lib/` is colocated with its `*.stories.ts` file. Run `npm run storybook` to browse them on `http://localhost:6006`.

The Storybook setup:

- **`@storybook/vue3-vite`** as the framework — same Vite config the dev server uses, no duplicate build pipeline.
- **`@storybook/addon-essentials`** — controls, docs, viewport, backgrounds.
- **`@storybook/addon-a11y`** — surfaces axe-core findings in a sidebar panel for every story. Earns its place because the combobox is a11y-heavy; regressions show up here before they hit users.
- **Stories use `tags: ['autodocs']`** so the props / events / slots table populates from the component's TS types automatically.

A note on typing: Vue SFCs with `generic="T"` don't infer cleanly through Storybook's `Meta<typeof Component>`. Stories use the loose `Meta` form (no generic) and concrete types per render function — see `SearchableSelect.stories.ts`. The slash command `/scaffold-component` codifies this convention.

---

## Using the component

### Sync mode

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { SearchableSelect } from './lib';

type Country = { code: string; name: string };
const options: Country[] = [/* ... */];
const selected = ref<Country | null>(null);
</script>

<template>
  <SearchableSelect
    v-model="selected"
    :options="options"
    :get-value="(c) => c.code"
    :get-label="(c) => c.name"
  />
</template>
```

### Async mode

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { SearchableSelect, type Loader } from './lib';

type User = { id: number; name: string };
const selected = ref<User | null>(null);

const loader: Loader<User> = async (query, signal) => {
  const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal });
  return res.json();
};
</script>

<template>
  <SearchableSelect
    v-model="selected"
    :loader="loader"
    :get-value="(u) => u.id"
    :get-label="(u) => u.name"
    :debounce-ms="250"
    :min-query-length="1"
  >
    <template #option="{ item }">
      <strong>{{ item.name }}</strong>
    </template>
  </SearchableSelect>
</template>
```

### Props

| Prop              | Type                                                | Default      | Notes                                                  |
|-------------------|-----------------------------------------------------|--------------|--------------------------------------------------------|
| `modelValue`      | `T \| null`                                         | required     | v-model target                                         |
| `options`         | `T[]`                                               | —            | sync mode                                              |
| `loader`          | `(query, signal) => Promise<T[]>`                   | —            | async mode (pick one of options/loader)                |
| `getValue`        | `(item: T) => string \| number`                     | required     | identity for `:key` and selection                      |
| `getLabel`        | `(item: T) => string`                               | required     | display + filter target                                |
| `debounceMs`      | `number`                                            | `250`        | async only                                             |
| `loadOnEmpty`     | `boolean`                                           | `false`      | call loader for empty query                            |
| `minQueryLength`  | `number`                                            | `0`          |                                                        |
| `placeholder`     | `string`                                            | `'Search…'`  |                                                        |
| `disabled`        | `boolean`                                           | `false`      |                                                        |

Slots: `option` (per-item render). Events: `select`, `open`, `close`, plus `update:modelValue`.

---

## Defensible choices

The assignment asks for defensible choices documented. Here they are.

1. **WAI-ARIA APG combobox-with-listbox-popup, manual-selection variant.** Tab closes without selecting; only Enter selects. Auto-select-on-Tab confuses keyboard users tabbing through forms.

2. **DOM focus stays on the `<input>` throughout.** Highlighted option moves via `aria-activedescendant`, not `.focus()` on options. This is the central a11y mistake naive AI output makes; the rule is encoded in `frontend-components/combobox.md` and the `a11y-reviewer` subagent flags it on review.

3. **`mousedown.prevent` on options, not `click`.** `click` fires after `blur`; the dropdown closes on blur, so a click handler never fires. `mousedown` fires before, `preventDefault` keeps focus on the input.

4. **`AbortController` + monotonic request-ID guard for race safety.** AbortController alone is insufficient — a custom loader may not honor the signal, and an aborted promise can still settle. The `useAsyncQuery` composable pairs both. The guard is the rule naive AI most often misses; demo #3 is a stress test that intentionally produces out-of-order responses to validate it.

5. **Discriminated union for state.** `{ kind: 'idle' | 'loading' | 'error' | 'ready' }` instead of separate `isLoading` / `error` / `items` refs. Makes "loading + error both true" unrepresentable.

6. **Generic over `T` with consumer-passed accessors.** Consumer provides `getValue` and `getLabel`; the component never assumes `.id` / `.label` keys. Different APIs return different shapes.

7. **`lodash-es`'s `debounce`.** Battle-tested timing semantics, built-in `.cancel()` / `.flush()`, correct TS signatures. Hand-rolled `setTimeout` debouncing is banned.

8. **Pinia for cross-cutting state, component-local for interaction.** Component internals (`open`, `query`, `highlightIndex`, async lifecycle) stay component-local — they're presentational, not domain. Pinia holds selections + the `search` action wrapping the API. Reasoning is in `architecture/state-management.md`.

9. **API layer separate from stores.** `src/api/` exports plain async functions with no reactivity. Stores call them. Swapping the mock for a real `fetch` should touch no component or store.

10. **No UI library.** The deliverable is the component itself; wrapping Headless UI / PrimeVue / Radix-Vue would be a different deliverable.

---

## AI tool configuration

This is the part the assignment grades. The configuration that steered Claude Code through the build is committed at conventional paths.

### `CLAUDE.md`

Always-loaded project context: stack pin, design principles, file layout, list of `@`-imported rule files. Kept short (~50 lines) so it doesn't crowd the context window.

### `.claude/rules/`

Topical rule files, organized into three folders:

```
.claude/rules/
├── general/                       Apply to all code
│   ├── vue3.md                    Composition API idioms, generics, reactivity gotchas
│   ├── typescript.md              tsconfig contract, generic-component typing, discriminated unions
│   ├── testing.md                 Vitest + VTU patterns, role queries, out-of-order test template
│   └── anti-patterns.md           Concrete don'ts grouped by category
├── architecture/                  Cross-cutting design choices
│   ├── state-management.md        Component-local default; Pinia for cross-cutting; API layer separate
│   └── dependencies.md            lodash-es for debouncing; bar for adding deps
└── frontend-components/           Component-class rules
    ├── form-inputs.md             Native elements, labels, IME, validation library agnosticism
    ├── menus-and-popovers.md      Open/close, click-outside, focus by pattern, role table
    ├── combobox.md                WAI-ARIA APG combobox: keyboard map, mousedown-not-click, focus stays on input
    └── async-search.md            Debounce + AbortController + request-ID guard pattern
```

Every rule is concrete and project-specific. Generic "be helpful, write clean code" guidance was deliberately stripped during review (see git log) — the assignment brief explicitly penalizes it.

The highest-leverage files:

- `frontend-components/combobox.md` — WAI-ARIA keyboard table; the focus-on-input rule and mousedown-vs-click rule are called out as "the mistakes naive AI makes".
- `frontend-components/async-search.md` — the **request-ID-guard rule** for out-of-order responses, with the exact code pattern. This is the single most important async correctness rule.
- `architecture/state-management.md` — when state goes in component vs Pinia; the API/repository layer is separate.

### `.claude/commands/` — custom slash commands

Five commands cover the loop of building and reviewing a component. Each one references specific rule files so the agent reads the right context, instead of relying on whatever's already in scope.

#### `/scaffold-component <Name>`
Scaffolds a new component under `src/lib/<Name>/`. Before writing, the command picks the applicable component-class rule files based on what the component does (form input? popover? combobox? async search?), reads them, and follows the patterns they specify rather than improvising.

It generates: the `.vue` file (with `<script setup lang="ts" generic="T">`, typed props/emits/defineModel, `ListState<T>` discriminated union, ARIA structure), any required composables (`useAsyncQuery.ts` if async — implementing the **exact** debounce + AbortController + monotonic request-ID-guard pattern), `types.ts`, `index.ts` barrel, `*.spec.ts` skeleton with `it.todo` for every required test, and `*.stories.ts` with one variant per applicable mode. It also adds the export to `src/lib/index.ts` so the new component is part of the public library API.

#### `/a11y-audit <file>`
Audits a component file against the ARIA pattern its interaction implies. The command identifies the pattern first (input + popup listbox → combobox; trigger + popup → menu; modal popup → dialog) and then walks the relevant checklist from `frontend-components/combobox.md` or `frontend-components/menus-and-popovers.md`.

For combobox audits it checks 13 specific items: required `role`/`aria-*` attributes on input + listbox + options, focus management (DOM focus must stay on input, never `.focus()` on options), `mousedown.prevent` instead of `click` on options, the full keyboard map per the APG table, click-outside cleanup, and live-region usage for status messages. Output is a `# / Check / Status / Where` table plus a Findings section with `file:line` and a one-line fix per FAIL.

#### `/test-component <file>`
Generates a Vitest spec file colocated with the component, using the role-based query patterns and the deferred-promise out-of-order test template from `general/testing.md`. The command consults the relevant component-class rule files to know which tests are required: combobox tests for combobox components, async-search tests for components that load asynchronously.

The async out-of-order test (resolve query 1 *after* query 2 and assert query 2's results win) is non-negotiable and gets emitted whenever a loader is present — that's the single highest-leverage test for catching naive async code.

#### `/async-review [file]`
Reviews async loader code against the rules in `frontend-components/async-search.md`. Defaults to scanning all `src/**/useAsync*.ts` if no file argument is given. Verifies seven specific properties: debounce on input, fresh `AbortController` per call with the previous one aborted, the **monotonic request-ID guard** in both resolve and reject paths, silent `AbortError` handling, real errors surfaced to state, cancellation on unmount, and IME composition gating. The request-ID guard check is flagged loudly because it's the rule naive AI most often misses.

#### `/vue-review`
A pre-commit-style review: walks `git diff` and grades the change against every rule file in `.claude/rules/`. Output is a checklist grouped by rule file with `file:line — description — fix` entries. If the diff passes, it says so explicitly — no platitudes.

### `.claude/agents/a11y-reviewer` — the WAI-ARIA subagent

A read-only subagent specialized in WAI-ARIA combobox / menu / dialog audits. It exists for two reasons: (1) the WAI-ARIA combobox pattern has enough specific rules that delegating to a focused agent produces tighter output than asking the main agent in the middle of a build; (2) read-only scope means it can't accidentally edit anything during review.

**Tools** are explicitly restricted to `Read`, `Grep`, `Glob` — no `Edit`, `Write`, `Bash`, or shell access. The frontmatter looks like:

```yaml
---
name: a11y-reviewer
description: Read-only audit of a Vue component against its ARIA pattern (combobox, menu, dialog, etc.). Use proactively when reviewing any component with search / select / dropdown / popup behavior.
tools: Read, Grep, Glob
---
```

**System prompt** scopes it to the project's `frontend-components/combobox.md` and `frontend-components/menus-and-popovers.md` rule files. It first identifies the pattern from the component, then runs the relevant checklist. Two specific naive-AI failure modes are called out as "flag loudly":
1. `.focus()` calls on highlighted options instead of moving via `aria-activedescendant`.
2. `@click` handlers on options instead of `@mousedown.prevent` (because `click` fires after `blur`).

**Output format** is structured: a `# / Check / Status (PASS/FAIL/N/A) / Where (file:line)` table, a `Findings` section with one-line fixes per FAIL, and a verdict line (`<n> FAIL / <m> PASS — <ready to ship | not ready to ship without fixing X>`). The agent never writes a fix — that's a separate decision the user or the parent agent makes.

**Invocation**: implicitly via `/a11y-audit`, or directly when reviewing any component with combobox / menu / popover behavior.

### `.claude/settings.json`

Permission allowlist for routine commands (`npm install`, `npm run *`, `npx vitest`, `npx vite`, `npx tsc`, `git diff`/`status`/`log`/`show`) and a deny-list for destructive ops (`git push --force`, `git reset --hard`, `rm -rf`).

---

## Scaffolding a new component

Suppose you want to add a `UserPicker` that follows the same conventions:

```text
> /scaffold-component UserPicker
```

The command:

1. Reads the relevant rule files, deciding which apply based on what the component does (form input? popover? combobox? async search?).
2. Creates `src/lib/UserPicker/`:
   - `UserPicker.vue` — `<script setup lang="ts" generic="T">`, `defineProps<...>()`, `defineModel<T | null>()`, typed emits, `ListState<T>` discriminated union, ARIA structure per the combobox rule.
   - `useAsyncQuery.ts` (if async) — implements the **exact** debounce + AbortController + monotonic request-ID-guard pattern from `frontend-components/async-search.md`. The sequence-ID guard is non-negotiable.
   - `useListNavigation.ts` (if keyboard-navigated list).
   - `useClickOutside.ts` (if it opens a popover).
   - `types.ts` — exports the public surface.
   - `index.ts` — barrel re-export.
   - `UserPicker.spec.ts` — skeleton with `it.todo` for every test required by the relevant component-class sections in `general/testing.md`.
   - `UserPicker.stories.ts` — Storybook stories with at least one variant per applicable mode.
3. Adds the component to `src/lib/index.ts` so it's part of the public library API.
4. Runs `npm run type-check` and reports any errors.

After scaffolding, fill in the `it.todo` tests with `/test-component src/lib/UserPicker/UserPicker.vue`, then audit the a11y with `/a11y-audit src/lib/UserPicker/UserPicker.vue`.

---

## What's not yet done

- **Tests for `SearchableSelect`** — the spec file isn't written. `/test-component src/lib/SearchableSelect/SearchableSelect.vue` would scaffold it from the test list in `general/testing.md`. The demo verifies the behavior end-to-end in the browser; unit tests are the next step.
- **Real backend** — the API layer in `src/api/` is mock-only.

The goal of this submission is the configuration that shaped how the component was built, plus the component itself running cleanly in the demo. Tests would be written next, scaffolded by the slash command and reviewed against `general/testing.md`.
