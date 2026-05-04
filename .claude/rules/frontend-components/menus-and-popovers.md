# Menus, popovers, dropdowns — required idioms

These rules apply to **any component that opens floating content** — menus, listboxes, dropdowns, popovers, autocomplete suggestion lists, tooltips, simple dialogs.

## Open/close state
- Component-local. Don't store open/close in URL, localStorage, or a state manager.
- Single source of truth: one ref (`open`). Don't track `isOpen` in two places.

## Closing behavior
Every popover MUST close on:

1. **Escape key** — always. Even if the popover doesn't otherwise handle keyboard.
2. **Click outside** — `pointerdown` listener on `document`. Ignore if `event.composedPath().includes(rootEl.value)`. Register in `onMounted`, remove in `onBeforeUnmount`.
3. **Loss of focus** — when appropriate. Decide per pattern; for example, a combobox does NOT close on every blur because clicking an option blurs the input.

`pointerdown` covers touch and mouse uniformly. Don't use `mousedown` (misses touch) or `click` (fires after blur — too late).

## Focus management depends on the pattern

- **Listbox-as-popup-of-combobox**: DOM focus stays on the input. Highlight moves via `aria-activedescendant`. **No `.focus()` on options.** See `combobox.md`.
- **Menu (button-triggered)**: focus moves into the menu, navigated by arrow keys, returns to the trigger on close. Use roving tabindex or `aria-activedescendant`.
- **Modal dialog**: focus trapped inside; first focusable element receives focus on open; focus returns to the trigger on close.
- **Tooltip**: never receives focus. Hover/focus on the trigger reveals it; Escape dismisses.

Pick one and stick with it. Don't half-implement focus trap on a non-modal.

## ARIA roles match the interaction, not the visual

| Pattern         | role                                          | Notes                                          |
|-----------------|-----------------------------------------------|------------------------------------------------|
| Listbox popup   | `role="listbox"` on container, `role="option"` on items | `aria-selected` per option                |
| Menu            | `role="menu"` on container, `role="menuitem"` on items  |                                                |
| Modal dialog    | `role="dialog"` + `aria-modal="true"`         | Trap focus                                     |
| Tooltip         | `role="tooltip"`                              |                                                |

The visual styling does not determine the role. A "dropdown that looks like a menu but acts like a select" is a listbox.

## Status messages
Loading / error / empty messages shown inside the popover go in a node with `role="status" aria-live="polite"` so screen-reader users hear them without focus moving.

## Positioning
- Prefer CSS-only positioning (absolute + transform) for predictable, performant layouts.
- Use `floating-ui` only when you need flip / shift behavior near viewport edges. Don't pull it in for static placement.
- Consider the native `popover` attribute (Baseline 2024) where it fits — it gives free top-layer rendering and isn't clipped by `overflow: hidden` parents.

## Banned
- ❌ Storing open state in URL or localStorage.
- ❌ Global `window.addEventListener` without `onMounted` / `onBeforeUnmount` cleanup.
- ❌ `tabindex` on options to make them focusable when the pattern says focus stays elsewhere.
- ❌ Custom focus trap on a non-modal popover.
- ❌ Closing on every blur indiscriminately — option clicks blur the input; you need pattern-aware close logic.
