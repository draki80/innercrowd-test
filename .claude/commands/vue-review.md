---
description: Review uncommitted changes against every rule file in .claude/rules/
---

Review the current uncommitted diff against every rule file in `.claude/rules/`.

Run `git status` and `git diff` to identify changed files. For each changed `.vue`, `.ts`, or test file, walk through the rules in:

**General rules (apply to all code):**
1. `.claude/rules/general/vue3.md` — Composition API idioms, generics, reactivity gotchas, composable conventions.
2. `.claude/rules/general/typescript.md` — strict flags, no `any`/`!`, generic typing, discriminated unions.
3. `.claude/rules/general/testing.md` — role queries, behavior-first, fake timers.
4. `.claude/rules/general/anti-patterns.md` — every concrete ❌ in that file.

**Component-class rules (apply by component type):**
5. `.claude/rules/frontend-components/form-inputs.md` — for any input component.
6. `.claude/rules/frontend-components/menus-and-popovers.md` — for any open/close UI.
7. `.claude/rules/frontend-components/combobox.md` — for combobox components specifically.
8. `.claude/rules/frontend-components/async-search.md` — for any async query-on-input.

For each changed component, identify which component-class files apply and audit against those.

Output is a checklist grouped by rule file. Each violation: `file:line — <one-sentence description> — fix: <one-sentence fix>`.

If everything passes, say so explicitly: "All rules pass on the current diff." Don't pad the output.

Tone: a senior engineer reviewing a PR. Specific, terse, no platitudes. No "great job!" — just the findings.
