# Combobox / searchable select — required pattern

A combobox is the composition of a text input and a popup listbox. This file extends `form-inputs.md` and `menus-and-popovers.md` with the rules specific to the combobox pattern.

Reference: **WAI-ARIA Authoring Practices 1.2 — "Combobox with List Autocomplete"** — https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

## DOM structure
```html
<div ref="rootEl">
  <input
    role="combobox"
    aria-expanded="true|false"
    aria-controls="listbox-id"
    aria-autocomplete="list"
    :aria-activedescendant="highlightedId || undefined"
    :value="query"
  />
  <ul role="listbox" id="listbox-id" v-show="open">
    <li
      v-for="(item, i) in items"
      role="option"
      :id="optionId(i)"
      :aria-selected="i === highlightIndex"
      @mousedown.prevent="select(item)"
    >
      <slot name="option" :item="item">{{ getLabel(item) }}</slot>
    </li>
  </ul>
  <div role="status" aria-live="polite" v-if="state.kind === 'loading' || state.kind === 'error'">
    {{ statusMessage }}
  </div>
</div>
```

## Focus management — the rule AI gets wrong
**DOM focus stays on the `<input>` for the entire interaction.** Highlighted option moves via `aria-activedescendant`. **Do NOT** call `.focus()` on `<li role="option">` elements. This is the central a11y mistake naive output makes; reject it on review.

## Keyboard map (be exhaustive — these are required)

| Key             | Closed                            | Open                                                   |
|-----------------|-----------------------------------|--------------------------------------------------------|
| ArrowDown       | Open + highlight first option     | Move highlight down. Wrap is optional; default no-wrap. |
| ArrowUp         | Open + highlight last option      | Move highlight up.                                      |
| Home            | (no-op)                           | Highlight first option.                                 |
| End             | (no-op)                           | Highlight last option.                                  |
| Enter           | (no-op)                           | Select highlighted option; if none highlighted, no-op.  |
| Escape          | (no-op)                           | Close. Restore input value to selected label.           |
| Tab             | Default tab behavior              | Close without selecting. Tab continues to next field.   |
| Printable char  | Open + apply as filter query      | Apply as filter query.                                  |
| Backspace empty | Optional: clear current selection | Optional: clear current selection                       |

The "Tab without selecting" rule is the **manual selection** APG variant — picked deliberately. Auto-select-on-tab confuses keyboard users tabbing through forms.

## Click handlers — the second rule AI gets wrong
**Use `mousedown` with `preventDefault()`, not `click`.**

1. The `<input>` has focus.
2. Clicking an option triggers `blur` on the input.
3. `blur` triggers our close-on-blur logic, closing the dropdown.
4. `click` fires *after* blur, so the dropdown is already closed by the time the click handler runs.

```vue
<li @mousedown.prevent="select(item)">…</li>
```

## State machine
List state is a discriminated union, not a bag of booleans:

```ts
type ListState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; error: Error }
  | { kind: 'ready'; items: T[] };
```

Render with explicit `v-if` chains on `state.kind`. This makes "loading + error simultaneously" unrepresentable.

## Banned
- ❌ `<div role="combobox">` instead of a real `<input>`.
- ❌ `aria-owns` instead of `aria-controls` — the spec calls for `aria-controls` on combobox.
- ❌ `tabindex` on options.
- ❌ `v-html` for option labels — use a slot, default escapes.
- ❌ Calling `.focus()` on options.
