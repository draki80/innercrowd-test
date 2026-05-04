---
description: Generate a Vitest spec file for a component using project test patterns
argument-hint: <path-to-component>
---

Generate a Vitest + @vue/test-utils spec file for the component at `$ARGUMENTS`.

Read `.claude/rules/general/testing.md` first — it has the role-query patterns, the out-of-order test template, the debounce/fake-timers pattern, and the test list per component-class.

Then read whichever component-class rule files apply to this component:

- Combobox → `.claude/rules/frontend-components/combobox.md` (and the combobox tests in `general/testing.md`)
- Async-search → `.claude/rules/frontend-components/async-search.md` (and the async tests in `general/testing.md`)
- Form input → `.claude/rules/frontend-components/form-inputs.md`
- Popover/menu/dropdown → `.claude/rules/frontend-components/menus-and-popovers.md`

The spec must include every test required by the applicable component-class sections in `general/testing.md`. If a case isn't applicable to this specific component, write it as `it.skip` with a one-line comment explaining why.

The async out-of-order test (when applicable) is **non-negotiable** — it's the single highest-leverage test for catching naive async code.

Test file path: same directory as the component, named `<ComponentName>.spec.ts`.

Use role queries (`[role="combobox"]`, `[role="option"]`), not implementation-internal queries.

After writing, run `npx vitest run "$ARGUMENTS"` and report the result. If tests fail, surface the failure but do not modify the component to make them pass — the spec file describes intended behavior; the component fix is a separate decision the user makes.
