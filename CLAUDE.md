# Vue 3 Component Sandbox — Project Context

## Stack (do not deviate)
- **Vue 3.4+** with `<script setup lang="ts">`. Composition API only.
- **TypeScript 5.x** strict (see `.claude/rules/general/typescript.md`).
- **Vite 6+**.
- **Vitest** + `@vue/test-utils` + `happy-dom`.
- **Pinia** for cross-cutting domain state. Component-local state for interaction concerns. See `.claude/rules/architecture/state-management.md`.
- **Custom CSS only.** No Tailwind, no PrimeVue, no Headless UI, no UI kit.

## Project shape
A Vue 3 + TS sandbox for building small, reusable, accessible UI components from scratch. Every component:
- Lives in `src/lib/<Name>/`.
- Has a colocated `*.spec.ts`, `types.ts`, and any composables it needs.
- Is generic over its data type when applicable; consumer-controlled accessors (`getValue`, `getLabel`, etc.) — not hardcoded keys.
- Has a discriminated-union state shape, not a bag of booleans.
- Implements its WAI-ARIA pattern correctly (see the rule files).

The `src/demo/App.vue` page exercises components with mock data sourced from `src/api/` and accessed through Pinia stores in `src/stores/`.

## Current focus
The first component is a **searchable select** (combobox + async loader). Specific rules are in `.claude/rules/frontend-components/combobox.md` and `.claude/rules/frontend-components/async-search.md`. The general patterns there apply to any future combobox or async-search component.

## File layout
```
src/
  lib/                         # the reusable component library (public API: lib/index.ts)
    <ComponentName>/
      <ComponentName>.vue
      <ComponentName>.stories.ts # Storybook story (colocated)
      use*.ts                  # composables (one per concern)
      types.ts                 # public types
      <ComponentName>.spec.ts  # colocated tests
    index.ts                   # re-exports the library's public surface
  api/                         # mock/real API — plain async functions, no reactivity
  stores/                      # Pinia stores (setup syntax) — domain state + thin actions over the API
  demo/App.vue                 # demo page (consumer of lib/)
  main.ts
.storybook/                    # Storybook config
```

## Detailed rules (loaded via @-import)

General — apply to all code:
@.claude/rules/general/vue3.md
@.claude/rules/general/typescript.md
@.claude/rules/general/testing.md
@.claude/rules/general/anti-patterns.md
@.claude/rules/architecture/state-management.md
@.claude/rules/architecture/dependencies.md

Component-class rules — apply when building components of these kinds:
@.claude/rules/frontend-components/form-inputs.md
@.claude/rules/frontend-components/menus-and-popovers.md
@.claude/rules/frontend-components/combobox.md
@.claude/rules/frontend-components/async-search.md

## Custom slash commands
- `/scaffold-component <Name>` — scaffold a component + composables + spec stub per project conventions.
- `/a11y-audit <file>` — audit a component against the relevant ARIA pattern.
- `/test-component <file>` — generate a Vitest spec file from `general/testing.md` and the relevant component-class rules.
- `/async-review [file]` — audit async code for race-condition safety.
- `/vue-review` — review uncommitted changes against every rule file.

## Verifying changes
- `npm run type-check` — strict typecheck.
- `npm run test:run` — full test suite.
- `npm run dev` — start dev server, exercise components manually (incl. keyboard-only and screen reader).
