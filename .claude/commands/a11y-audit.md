---
description: Audit a component file against the relevant ARIA pattern (combobox, listbox, dialog, etc.)
argument-hint: <path-to-component>
---

Audit the file `$ARGUMENTS` against the ARIA pattern that matches its interaction. Identify the pattern first by reading the file:

- Input + popup listbox → **combobox** (use `.claude/rules/frontend-components/combobox.md`).
- Trigger button + popup menu → **menu**.
- Modal popup → **dialog**.
- Other popover types → use `.claude/rules/frontend-components/menus-and-popovers.md`.

If the pattern isn't recognizable or the file isn't a component, report "N/A" and exit. Do not invent findings.

For combobox audits, run the following checks:

1. Input has `role="combobox"`.
2. Input has `aria-expanded` bound to open state.
3. Input has `aria-controls` bound to listbox id.
4. Input has `aria-autocomplete="list"`.
5. Input has `aria-activedescendant` when an option is highlighted (and only then).
6. Listbox has `role="listbox"` and a stable id matching the input's `aria-controls`.
7. Each option has `role="option"`, a stable id, and `aria-selected` reflects selection.
8. DOM focus stays on the input — no `.focus()` calls on options.
9. Option click handlers use `mousedown` with `preventDefault`, NOT `click`.
10. ArrowDown / ArrowUp / Home / End / Enter / Escape / Tab handled per the keyboard table in `frontend-components/combobox.md`.
11. Click-outside registered in `onMounted` and removed in `onBeforeUnmount`.
12. Loading / error messages render in a `role="status" aria-live="polite"` region.
13. No banned patterns: `<div role="combobox">`, `aria-owns`, `outline: none` without replacement, `v-html` for option labels, `tabindex` on options.

For other patterns: derive the equivalent checklist from `frontend-components/menus-and-popovers.md` + the relevant role section.

## Output

Markdown table with **#**, **Check**, **Status** (PASS / FAIL / N/A), **Where** (file:line). Append a "Findings" section beneath with `file:line — <one-sentence description> — fix: <one-sentence fix>` for each FAIL. End with a verdict: `<n> FAIL / <m> PASS — <ready to ship | not ready to ship without fixing X>`.

Use the Read tool on `$ARGUMENTS`. Use Grep if you need to look across composables that the file imports.
