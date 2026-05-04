# SearchableSelect

A reusable, accessible, generic `<SearchableSelect<T>>` component for Vue 3 — built primarily to demonstrate **how the AI tooling around it was configured to produce it reliably**.

The component lives at `src/lib/SearchableSelect/`. The demo at `src/demo/App.vue` exercises it in four configurations (sync, async, race-condition stress, error). Storybook stories at `src/lib/SearchableSelect/SearchableSelect.stories.ts` mirror those four.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command                  | What it does                                |
|--------------------------|---------------------------------------------|
| `npm run dev`            | Vite dev server                             |
| `npm run type-check`     | `vue-tsc --noEmit` against `tsconfig.app.json` |
| `npm run build`          | type-check + production build to `dist/`    |
| `npm run test`           | Vitest watch mode                           |
| `npm run test:run`       | Vitest single run                           |
| `npm run storybook`      | Storybook on http://localhost:6006          |
| `npm run build-storybook`| Static Storybook build to `storybook-static/` |

---

# Part 1 — AI tooling

This project was built with **Claude Code** as the primary tool. Everything that steered it is committed at conventional paths so a reviewer can read the configuration in context. The four pieces are: project rules (`CLAUDE.md` + `.claude/rules/`), custom slash commands (`.claude/commands/`), a specialized subagent (`.claude/agents/`), and permissions (`.claude/settings.json`).

## `CLAUDE.md` — always-loaded project context

A short (~50 line) front-matter file pinned to the repo root. Loaded into every conversation automatically. Holds:

- Stack pin (Vue 3 + TS strict, Vite, Vitest, Pinia, custom CSS — *no* UI kit).
- File-layout convention (`src/lib/<Component>/` colocated with composables, types, spec, story).
- The list of `@`-imported rule files so the agent picks them up by reference instead of having them inlined.

It deliberately does **not** restate the rules — those live in `.claude/rules/` so they can be updated independently and so file-specific guidance stays scoped.

## `.claude/rules/` — topical rule files

Three folders, organized by scope.

```
.claude/rules/
├── general/                      Apply to all code
│   ├── vue3.md                   Composition API idioms, generics, reactivity gotchas
│   ├── typescript.md             tsconfig contract, generic-component typing, discriminated unions
│   ├── testing.md                Vitest + VTU patterns, role queries, out-of-order test template
│   └── anti-patterns.md          Concrete don'ts grouped by category
├── architecture/                 Cross-cutting design choices
│   ├── state-management.md       Component-local default; Pinia for cross-cutting; API layer separate
│   └── dependencies.md           lodash-es for debouncing; bar for adding deps
└── frontend-components/          Component-class rules
    ├── form-inputs.md            Native elements, labels, IME, validation library agnosticism
    ├── menus-and-popovers.md     Open/close, click-outside, focus by pattern, role table
    ├── combobox.md               Combobox keyboard map; mousedown-not-click; focus stays on input
    └── async-search.md           Debounce + AbortController + request-ID guard pattern
```

**Every rule is concrete and project-specific.** Generic "be helpful, write clean code" guidance was deliberately stripped — the brief explicitly penalizes it. Each rule names a wrong pattern (with code), the right one (with code), and the *why* (so the agent can judge edge cases instead of pattern-matching).

The highest-leverage three:

- **`frontend-components/combobox.md`** — full keyboard table; spells out "focus stays on the input, never `.focus()` on options" and "`mousedown.prevent` on options, never `click`" because those are the two combobox mistakes naive AI output makes.
- **`frontend-components/async-search.md`** — the **request-ID guard** rule for out-of-order responses, with the exact code pattern. AbortController alone is *not* sufficient: a custom loader may not honor the signal, an aborted promise can still settle. The guard catches what abort can't. This is the single highest-impact async rule.
- **`architecture/state-management.md`** — when state goes in a component vs. Pinia; the API layer is separate from stores so swapping the mock for a real `fetch` shouldn't touch any component or store.

## `.claude/commands/` — custom slash commands

Five commands codify the loop of building and reviewing a component. Each one references specific rule files so the agent reads the right context, instead of relying on whatever happens to be in scope.

| Command | Purpose |
|---|---|
| `/scaffold-component <Name>` | Scaffold a new `src/lib/<Name>/`: `.vue`, composables, `types.ts`, barrel `index.ts`, spec skeleton with `it.todo` per required test, Storybook story, and an entry in `src/lib/index.ts`. Picks applicable component-class rule files based on what the component does — input? popover? combobox? async search? — and follows them. |
| `/a11y-audit <file>` | Identify the ARIA pattern (combobox / menu / dialog / popover) and walk the relevant 13-point checklist. Output is a `# / Check / Status / Where (file:line)` table plus a Findings section with one-line fixes per FAIL. |
| `/test-component <file>` | Generate a Vitest spec colocated with the component, using role-based queries and the deferred-promise out-of-order test template. The async out-of-order test is non-negotiable when a `loader` is present. |
| `/async-review [file]` | Review async loader code against `frontend-components/async-search.md`. Verifies seven properties; the **request-ID guard** check is flagged loudly because it's the rule naive AI most often misses. |
| `/vue-review` | Pre-commit walk-through of `git diff` against every rule file. Output is grouped by rule file with `file:line — description — fix` entries. |

## `.claude/agents/a11y-reviewer` — read-only subagent

A specialized subagent for accessibility audits. Two reasons it exists:

1. The combobox pattern has enough specific rules that delegating to a focused agent produces tighter output than asking the main agent mid-build.
2. **Read-only scope** — its tool list is restricted to `Read, Grep, Glob`. No `Edit`, `Write`, `Bash`, or shell access. It can't accidentally modify code during review.

```yaml
---
name: a11y-reviewer
description: Read-only audit of a Vue component against its ARIA pattern. Use proactively when reviewing any component with search / select / dropdown / popup behavior.
tools: Read, Grep, Glob
---
```

The system prompt scopes it to `frontend-components/combobox.md` and `frontend-components/menus-and-popovers.md`. It calls out the same two naive-AI failures the rule files do (`.focus()` on options, `@click` instead of `@mousedown.prevent`). Output is a fixed table + Findings + verdict format. The agent **never writes a fix** — that's a separate decision the parent agent or user makes.

Invoked via `/a11y-audit`, or by direct prompt when reviewing any component with combobox / menu / popover behavior.

## `.claude/settings.json` — permissions

A permission allowlist for routine commands (`npm install`, `npm run *`, `npx vitest`, `npx vite`, `npx tsc`, `git diff`/`status`/`log`/`show`) and a deny-list for destructive ops (`git push --force`, `git reset --hard`, `rm -rf`). The agent doesn't have to ask before running a type-check; it does have to ask before destructive git or filesystem operations.

## MCP servers

One Model Context Protocol server is wired in:

- **Playwright MCP** — gives the agent live browser-automation tools (navigate, click, type, snapshot, evaluate). Used during the demo verification pass: started `npm run dev`, drove all four demo sections through real keyboard flows, captured the dev-mode warnings the demo's missing labels produce. Cache lives at `.playwright-mcp/` (gitignored).

## How the work was decomposed

The slash commands describe the loop, but the actual decomposition went:

1. **Set up rules first** — write `CLAUDE.md` + `.claude/rules/` *before* writing component code so the agent has the context from turn one.
2. **Scaffold via `/scaffold-component`** — the command picks rule files, writes the file tree, and adds the export to `src/lib/index.ts`.
3. **Implement** — the agent fills in the component and composables. The async composable is the highest-risk part; the rule file's exact code pattern is what makes it reliable.
4. **Review with `/a11y-audit`** — runs the read-only subagent. First pass found 1 blocker (no accessible name) + 2 majors (listbox visibility coupling, click-to-reopen after Escape). All fixed.
5. **Generate tests via `/test-component`** — produces 13 tests covering the required combobox + async-search behaviors. The first run failed two tests, both surfacing a real post-select reopen bug (`selectItem` was calling `inputEl.focus()`, which re-fired `@focus → maybeOpen`); fix was to drop the redundant `.focus()` call since `mousedown.prevent` already keeps focus on the input. All 13 now pass.
6. **Manual demo verification via Playwright MCP** — drove the four demo sections in a real browser. All work end-to-end.

---

# Part 2 — The component

## Defensible choices

1. **Manual-selection variant.** Tab closes without selecting; only Enter selects. Auto-select-on-Tab confuses keyboard users tabbing through a form.
2. **DOM focus stays on the `<input>` throughout.** Highlighted option moves via `aria-activedescendant`, not `.focus()` on options. Calling `.focus()` on options breaks the combobox pattern and confuses screen readers.
3. **`mousedown.prevent` on options, not `click`.** `click` fires *after* `blur`; on a combobox, `blur` closes the dropdown, so a `click` handler never runs. `mousedown` fires before, `preventDefault` keeps focus on the input.
4. **`AbortController` + monotonic request-ID guard.** AbortController alone is insufficient (custom loaders may ignore the signal; aborted promises can still settle). The guard captures a sequence number before `await` and the resolver checks it before mutating state. Demo #3 stress-tests this with random 100–1500ms latency.
5. **Discriminated union for state** — `{ kind: 'idle' | 'loading' | 'error' | 'ready' }` instead of `isLoading` / `error` / `items` refs. Makes "loading + error both true" unrepresentable; the template branches on `state.kind` and TS narrows automatically.
6. **Generic over `T` with consumer-passed accessors.** Consumer provides `getValue` and `getLabel`; the component never assumes `.id` / `.label` keys. Different APIs return different shapes.
7. **`lodash-es`'s `debounce`.** Battle-tested timing, built-in `.cancel()` / `.flush()`, correct TS signatures, integrates with Vitest fake timers. Hand-rolled `setTimeout` is banned.
8. **Pinia for cross-cutting state, component-local for interaction.** Component internals (`open`, `query`, `highlightIndex`, async lifecycle) stay component-local — they're presentational, not domain. Pinia holds selections + the `search` action wrapping the API.
9. **API layer separate from stores.** `src/api/` exports plain async functions with no reactivity. Stores call them. Swapping the mock for a real `fetch` should touch no component or store.
10. **No UI library.** The deliverable is the component itself; wrapping Headless UI / PrimeVue / Radix-Vue would be a different deliverable.

## Using it

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
    aria-label="Country"
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
    aria-label="User"
  >
    <template #option="{ item }">
      <strong>{{ item.name }}</strong>
    </template>
  </SearchableSelect>
</template>
```

### Props

| Prop              | Type                                         | Default      | Notes                                                  |
|-------------------|----------------------------------------------|--------------|--------------------------------------------------------|
| `modelValue`      | `T \| null`                                  | required     | v-model target                                         |
| `options`         | `T[]`                                        | —            | sync mode                                              |
| `loader`          | `(query, signal) => Promise<T[]>`            | —            | async mode (pick one of options/loader)                |
| `getValue`        | `(item: T) => string \| number`              | required     | identity for `:key` and selection                      |
| `getLabel`        | `(item: T) => string`                        | required     | display + filter target                                |
| `debounceMs`      | `number`                                     | `250`        | async only                                             |
| `loadOnEmpty`     | `boolean`                                    | `false`      | call loader for empty query                            |
| `minQueryLength`  | `number`                                     | `0`          |                                                        |
| `placeholder`     | `string`                                     | `'Search…'`  |                                                        |
| `disabled`        | `boolean`                                    | `false`      |                                                        |
| `ariaLabel`       | `string`                                     | —            | accessible name (provide this or `ariaLabelledby`)     |
| `ariaLabelledby`  | `string`                                     | —            |                                                        |

Slots: `option` (per-item render). Events: `select`, `open`, `close`, plus `update:modelValue`.

### Keyboard map

| Key           | Closed                          | Open                                       |
|---------------|---------------------------------|--------------------------------------------|
| ↓             | Open + highlight first option   | Move highlight down                        |
| ↑             | Open + highlight last option    | Move highlight up                          |
| Home / End    | (no-op)                         | Highlight first / last option              |
| Enter         | (no-op)                         | Select highlighted option                  |
| Esc           | (no-op)                         | Close · restore input to selected label    |
| Tab           | Default tab behavior            | Close without selecting                    |
| Printable     | Open + filter                   | Filter                                     |

## Tests

`src/lib/SearchableSelect/SearchableSelect.spec.ts` — 13 tests, all passing. Covers the required combobox + async-search behaviors:

- 9 combobox tests: ARIA attributes, ArrowDown opens, sync filter, Enter selects, mousedown selects, Escape reverts, click-outside closes, Tab closes without selecting, focus stays on input.
- 4 async tests: debounce, **out-of-order drop** (the highest-leverage one), idle/loading/error/ready states, unmount cancellation.

Run with `npm run test:run`.

## Project layout

```
test1/
├── src/
│   ├── lib/                            # the component library (public API: lib/index.ts)
│   │   ├── index.ts
│   │   └── SearchableSelect/
│   │       ├── SearchableSelect.vue
│   │       ├── SearchableSelect.stories.ts
│   │       ├── SearchableSelect.spec.ts
│   │       ├── useAsyncQuery.ts        # debounce + abort + sequence-ID guard
│   │       ├── useListNavigation.ts    # highlight index + keyboard helpers
│   │       ├── useClickOutside.ts      # pointerdown + composedPath
│   │       ├── types.ts
│   │       └── index.ts
│   ├── api/                            # plain async functions, no reactivity
│   │   ├── users.ts                    # mock API with configurable latency / fail
│   │   └── countries.ts                # static list
│   ├── stores/                         # Pinia stores (setup syntax)
│   │   ├── users.ts
│   │   └── countries.ts
│   ├── demo/App.vue                    # 4-configuration demo
│   └── main.ts
├── .storybook/                         # Storybook config (Vue 3 + Vite, a11y addon)
├── .claude/                            # AI tool configuration
│   ├── rules/
│   ├── commands/
│   ├── agents/
│   └── settings.json
├── CLAUDE.md
└── package.json
```

## Stack

- **Vue 3.5+** (`<script setup lang="ts" generic="T">`)
- **TypeScript 5.6** strict — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Vite 6** + **Vitest 3** + **@vue/test-utils** + **happy-dom**
- **Pinia** for cross-cutting state
- **lodash-es** for `debounce`
- **Storybook 8** with `addon-a11y` (axe-core surfaced per story)
- **Custom CSS only** — no Tailwind, no UI kit, no combobox library

## Known gaps

- **Real backend** — the API layer is mock-only. Swapping in `fetch` is a body change in `src/api/`; nothing else moves.
