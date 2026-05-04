<script setup lang="ts" generic="T">
import { computed, ref, useId, watch } from 'vue';
import type { ListState, Loader } from './types';
import { useAsyncQuery } from './useAsyncQuery';
import { useClickOutside } from './useClickOutside';
import { useListNavigation } from './useListNavigation';

const props = withDefaults(
  defineProps<{
    options?: T[];
    loader?: Loader<T>;
    getValue: (item: T) => string | number;
    getLabel: (item: T) => string;
    debounceMs?: number;
    loadOnEmpty?: boolean;
    minQueryLength?: number;
    placeholder?: string;
    disabled?: boolean;
    noResultsText?: string;
    loadingText?: string;
    errorTextPrefix?: string;
    ariaLabel?: string;
    ariaLabelledby?: string;
  }>(),
  {
    debounceMs: 250,
    loadOnEmpty: false,
    minQueryLength: 0,
    placeholder: 'Search…',
    disabled: false,
    noResultsText: 'No results',
    loadingText: 'Loading…',
    errorTextPrefix: 'Error: ',
  },
);

const modelValue = defineModel<T | null>({ required: true });

const emit = defineEmits<{
  select: [option: T];
  open: [];
  close: [];
}>();

if (import.meta.env.DEV && props.options !== undefined && props.loader !== undefined) {
  console.warn('[SearchableSelect] Both `options` and `loader` were provided. `loader` wins; `options` is ignored.');
}

if (import.meta.env.DEV && !props.ariaLabel && !props.ariaLabelledby) {
  console.warn('[SearchableSelect] Provide `ariaLabel` or `ariaLabelledby` so the combobox has an accessible name.');
}

const rootEl = ref<HTMLElement | null>(null);

const open = ref(false);
const composing = ref(false);
const query = ref<string>(modelValue.value !== null ? props.getLabel(modelValue.value) : '');

const uid = useId();
const listboxId = `ss-listbox-${uid}`;
const optionId = (index: number) => `ss-option-${uid}-${index}`;

const asyncQuery = props.loader
  ? useAsyncQuery<T>(props.loader, {
      debounceMs: props.debounceMs,
      loadOnEmpty: props.loadOnEmpty,
      minQueryLength: props.minQueryLength,
    })
  : null;

const state = computed<ListState<T>>(() => {
  if (asyncQuery) {
    return asyncQuery.state.value;
  }
  if (props.options === undefined) return { kind: 'idle' };
  if (query.value.length < props.minQueryLength) return { kind: 'idle' };
  const q = query.value.toLowerCase().trim();
  const items = q === ''
    ? props.options
    : props.options.filter((item) => props.getLabel(item).toLowerCase().includes(q));
  return { kind: 'ready', items };
});

const items = computed<readonly T[]>(() =>
  state.value.kind === 'ready' ? state.value.items : [],
);

const nav = useListNavigation<T>(items);

const highlightedId = computed<string | null>(() =>
  nav.highlightIndex.value < 0 ? null : optionId(nav.highlightIndex.value),
);

const status = computed<{ kind: 'loading' | 'error' | 'empty' | 'min'; msg: string } | null>(() => {
  if (!open.value) return null;
  const s = state.value;
  if (s.kind === 'loading') return { kind: 'loading', msg: props.loadingText };
  if (s.kind === 'error') return { kind: 'error', msg: `${props.errorTextPrefix}${s.error.message}` };
  if (s.kind === 'ready' && s.items.length === 0) return { kind: 'empty', msg: props.noResultsText };
  if (s.kind === 'idle' && props.minQueryLength > 0 && query.value.length < props.minQueryLength) {
    return {
      kind: 'min',
      msg: `Type at least ${props.minQueryLength} character${props.minQueryLength === 1 ? '' : 's'}`,
    };
  }
  return null;
});

useClickOutside(rootEl, () => {
  if (open.value) doClose();
});

watch(() => nav.highlightIndex.value, (idx) => {
  if (idx < 0) return;
  const el = rootEl.value?.querySelector<HTMLElement>(`#${CSS.escape(optionId(idx))}`);
  el?.scrollIntoView({ block: 'nearest' });
});

watch(modelValue, (newVal) => {
  if (!open.value) {
    query.value = newVal !== null ? props.getLabel(newVal) : '';
  }
});

function doOpen(): void {
  if (props.disabled) return;
  if (open.value) return;
  open.value = true;
  emit('open');
}

function doClose(): void {
  if (!open.value) return;
  open.value = false;
  nav.reset();
  query.value = modelValue.value !== null ? props.getLabel(modelValue.value) : '';
  asyncQuery?.cancel();
  emit('close');
}

function commitQuery(value: string): void {
  if (composing.value) return;
  query.value = value;
  doOpen();
  asyncQuery?.run(value);
  nav.reset();
}

function selectItem(item: T): void {
  modelValue.value = item;
  query.value = props.getLabel(item);
  emit('select', item);
  doClose();
}

function onInput(event: Event): void {
  commitQuery((event.target as HTMLInputElement).value);
}

function onCompositionStart(): void {
  composing.value = true;
}

function onCompositionEnd(event: CompositionEvent): void {
  composing.value = false;
  commitQuery((event.target as HTMLInputElement).value);
}

function maybeOpen(): void {
  if (props.disabled) return;
  if (props.loadOnEmpty || query.value !== '' || (props.options !== undefined && props.minQueryLength === 0)) {
    doOpen();
    asyncQuery?.run(query.value);
  }
}

function onFocus(): void {
  maybeOpen();
}

function onInputMousedown(): void {
  if (!open.value) maybeOpen();
}

function onKeyDown(event: KeyboardEvent): void {
  if (composing.value) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (!open.value) {
        doOpen();
        asyncQuery?.run(query.value);
        nav.moveFirst();
      } else {
        nav.moveDown();
      }
      return;
    case 'ArrowUp':
      event.preventDefault();
      if (!open.value) {
        doOpen();
        asyncQuery?.run(query.value);
        nav.moveLast();
      } else {
        nav.moveUp();
      }
      return;
    case 'Home':
      if (open.value) {
        event.preventDefault();
        nav.moveFirst();
      }
      return;
    case 'End':
      if (open.value) {
        event.preventDefault();
        nav.moveLast();
      }
      return;
    case 'Enter': {
      if (!open.value) return;
      const item = nav.highlightedItem.value;
      if (item !== null) {
        event.preventDefault();
        selectItem(item);
      }
      return;
    }
    case 'Escape':
      if (open.value) {
        event.preventDefault();
        doClose();
      }
      return;
    case 'Tab':
      if (open.value) doClose();
      return;
    default:
      return;
  }
}
</script>

<template>
  <div ref="rootEl" class="searchable-select" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <input
      type="text"
      role="combobox"
      class="searchable-select__input"
      :value="query"
      :aria-expanded="open"
      :aria-controls="listboxId"
      :aria-activedescendant="highlightedId ?? undefined"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      aria-autocomplete="list"
      autocomplete="off"
      spellcheck="false"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="onInput"
      @keydown="onKeyDown"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
      @focus="onFocus"
      @mousedown="onInputMousedown"
    />

    <ul
      v-show="open"
      :id="listboxId"
      role="listbox"
      class="searchable-select__listbox"
      :class="{ 'is-empty': items.length === 0 }"
    >
      <li
        v-for="(item, i) in items"
        :id="optionId(i)"
        :key="getValue(item)"
        role="option"
        :aria-selected="i === nav.highlightIndex.value"
        class="searchable-select__option"
        :class="{ 'is-highlighted': i === nav.highlightIndex.value }"
        @mousedown.prevent="selectItem(item)"
        @mouseenter="nav.setHighlight(i)"
      >
        <slot name="option" :item="item">{{ getLabel(item) }}</slot>
      </li>
    </ul>

    <div
      v-if="status"
      class="searchable-select__status"
      :class="`is-${status.kind}`"
      role="status"
      aria-live="polite"
    >
      {{ status.msg }}
    </div>
  </div>
</template>

<style scoped>
.searchable-select {
  position: relative;
  display: block;
  font: inherit;
}

.searchable-select__input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font: inherit;
  color: inherit;
  background: Field;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  border-radius: 0.375rem;
  transition: border-color 120ms ease;
}

.searchable-select.is-open .searchable-select__input {
  border-color: color-mix(in srgb, currentColor 60%, transparent);
}

.searchable-select__input:focus-visible {
  outline: 2px solid color-mix(in srgb, currentColor 60%, transparent);
  outline-offset: 1px;
}

.searchable-select__input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.searchable-select__listbox {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  background: Canvas;
  color: CanvasText;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  border-radius: 0.375rem;
  max-height: 16rem;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 6px 18px color-mix(in srgb, currentColor 18%, transparent);
}

.searchable-select__listbox.is-empty {
  border: none;
  box-shadow: none;
  padding: 0;
  background: transparent;
}

.searchable-select__option {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  user-select: none;
}

.searchable-select__option.is-highlighted {
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.searchable-select__status {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  padding: 0.5rem 0.75rem;
  background: Canvas;
  color: color-mix(in srgb, currentColor 70%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  border-radius: 0.375rem;
  z-index: 10;
  box-shadow: 0 6px 18px color-mix(in srgb, currentColor 12%, transparent);
  font-size: 0.875rem;
}

.searchable-select__status.is-error {
  color: color-mix(in srgb, #c0392b 80%, currentColor 20%);
}
</style>
