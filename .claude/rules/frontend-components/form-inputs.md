# Form & input components — required idioms

These rules apply to **any component that accepts user input** (text fields, selects, comboboxes, checkboxes, custom inputs).

## Use the native element
- Real `<input>`, `<button>`, `<select>`, `<textarea>` — styled to taste.
- **Do not** replace them with `<div role="textbox">` or similar. You drop dozens of free behaviors: text selection, IME, password managers, autofill, native keyboard semantics, accessibility tree integration.

## Labels
- Every input has a `<label>`, either visible or visually-hidden (`.sr-only` style class). Placeholder text is **not** a label.
- Associate via `for`/`id` or by wrapping the input. Don't rely on `aria-label` unless the visual design genuinely has no text label.

## v-model
- Use `defineModel<T>()` (Vue 3.4+) for any two-way binding. It's the canonical pattern.
- Don't roll a manual `modelValue` prop + `update:modelValue` emit pair when `defineModel` works.

## Focus
- Never `outline: none` without a `:focus-visible` replacement. Keyboard users need a visible focus indicator.
- Don't intercept `Tab`. Users must be able to escape the component into the next form field naturally.
- If the component has internal focus (e.g. opens a popover), restore focus to the opener on close.

## Disabled state
- `disabled` attr on the native element. CSS reflects with `cursor: not-allowed`.
- For custom-element disabled: also set `aria-disabled="true"` and skip the element in keyboard navigation.

## Validation
- Validation **lives in the parent**. The component takes a `valid?: boolean` prop and an `errorMessage?: string` prop and renders the error.
- Error text is associated to the input via `aria-describedby={errorId}`; the input gets `aria-invalid="true"` when invalid.
- Do not couple the component to a specific validation library (Vuelidate, Vee-Validate, Zod). The component is library-agnostic.

## Autocomplete
- Set `autocomplete` semantically: `autocomplete="off"` for ephemeral filter inputs (search-as-you-type), proper values for real form fields (`username`, `email`, `current-password`, etc.).

## Composition events (IME)
- For inputs that fire side effects on every keystroke (search, autocomplete), gate handlers on `compositionstart` / `compositionend`. Firing a fetch on every CJK composition character produces broken results.

```ts
const composing = ref(false);
function onCompositionStart() { composing.value = true; }
function onCompositionEnd(e: CompositionEvent) {
  composing.value = false;
  onInput((e.target as HTMLInputElement).value);
}
function onInput(value: string) {
  if (composing.value) return;
  // ...
}
```

## Banned
- ❌ Placeholder used as a label.
- ❌ `outline: none` without `:focus-visible` replacement.
- ❌ Custom `tabindex` values to override natural tab order.
- ❌ Replacing native input with `<div contenteditable>`.
- ❌ Coupling to a validation library inside the component.
