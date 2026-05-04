import { mount, flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SearchableSelect from './SearchableSelect.vue';

type Item = { id: number; label: string };
const getValue = (i: Item) => i.id;
const getLabel = (i: Item) => i.label;

const fruits: Item[] = [
  { id: 1, label: 'Apple' },
  { id: 2, label: 'Banana' },
  { id: 3, label: 'Cherry' },
];

function defer<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function mountSync(overrides: Record<string, unknown> = {}) {
  return mount(SearchableSelect as unknown as new () => unknown, {
    attachTo: document.body,
    props: {
      modelValue: null,
      options: fruits,
      getValue,
      getLabel,
      ariaLabel: 'Fruit',
      ...overrides,
    },
  });
}

describe('SearchableSelect — combobox a11y', () => {
  it('renders combobox with correct ARIA attributes', () => {
    const wrapper = mountSync();
    const input = wrapper.get('[role="combobox"]');
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.attributes('aria-controls')).toBeTruthy();
    expect(input.attributes('aria-autocomplete')).toBe('list');
    expect(input.attributes('aria-activedescendant')).toBeUndefined();
    const listboxId = input.attributes('aria-controls')!;
    const listbox = wrapper.get(`#${listboxId}`);
    expect(listbox.attributes('role')).toBe('listbox');
  });

  it('opens on ArrowDown — aria-expanded true, listbox visible, first option highlighted', async () => {
    const wrapper = mountSync();
    const input = wrapper.get('[role="combobox"]');
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.attributes('aria-expanded')).toBe('true');
    const options = wrapper.findAll('[role="option"]');
    expect(options).toHaveLength(3);
    const first = options[0];
    if (!first) throw new Error('expected first option');
    expect(input.attributes('aria-activedescendant')).toBe(first.attributes('id'));
    expect(first.attributes('aria-selected')).toBe('true');
  });

  it('filters as the user types (sync mode)', async () => {
    const wrapper = mountSync();
    const input = wrapper.get('[role="combobox"]');
    await input.setValue('an');
    const labels = wrapper.findAll('[role="option"]').map((o) => o.text());
    expect(labels).toEqual(['Banana']);
  });

  it('selects via Enter — emits update:modelValue with the highlighted item', async () => {
    const wrapper = mountSync();
    const input = wrapper.get('[role="combobox"]');
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([fruits[1]]);
    expect(wrapper.emitted('select')?.at(-1)).toEqual([fruits[1]]);
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('selects via mousedown — emits, dropdown closes', async () => {
    const wrapper = mountSync();
    const input = wrapper.get('[role="combobox"]');
    await input.trigger('keydown', { key: 'ArrowDown' });
    const option = wrapper.findAll('[role="option"]')[2];
    if (!option) throw new Error('expected third option');
    await option.trigger('mousedown');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([fruits[2]]);
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('closes on Escape — input value reverts to selected label', async () => {
    const wrapper = mountSync({ modelValue: fruits[0] });
    const input = wrapper.get('[role="combobox"]');
    expect((input.element as HTMLInputElement).value).toBe('Apple');
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.setValue('xyz');
    expect((input.element as HTMLInputElement).value).toBe('xyz');
    await input.trigger('keydown', { key: 'Escape' });
    expect(input.attributes('aria-expanded')).toBe('false');
    expect((input.element as HTMLInputElement).value).toBe('Apple');
  });

  it('closes on click outside (pointerdown on document)', async () => {
    const wrapper = mountSync();
    const input = wrapper.get('[role="combobox"]');
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.attributes('aria-expanded')).toBe('true');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await flushPromises();
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('Tab closes without selecting', async () => {
    const wrapper = mountSync();
    const input = wrapper.get('[role="combobox"]');
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'Tab' });
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('keeps focus on the input during keyboard navigation', async () => {
    const wrapper = mountSync();
    const input = wrapper.get('[role="combobox"]');
    (input.element as HTMLInputElement).focus();
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'End' });
    expect(document.activeElement).toBe(input.element);
  });
});

describe('SearchableSelect — async loader', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function mountAsync(
    loader: (q: string, s: AbortSignal) => Promise<Item[]>,
    overrides: Record<string, unknown> = {},
  ) {
    return mount(SearchableSelect as unknown as new () => unknown, {
      attachTo: document.body,
      props: {
        modelValue: null,
        loader,
        getValue,
        getLabel,
        debounceMs: 250,
        ariaLabel: 'Fruit',
        ...overrides,
      },
    });
  }

  it('debounces the loader — typing 5 keys quickly fires the loader once', async () => {
    const loader = vi.fn().mockResolvedValue([{ id: 1, label: 'A' }]);
    const wrapper = mountAsync(loader);
    const input = wrapper.get('[role="combobox"]');
    await input.setValue('a');
    await input.setValue('ap');
    await input.setValue('app');
    await input.setValue('appl');
    await input.setValue('apple');
    expect(loader).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader.mock.calls[0]?.[0]).toBe('apple');
  });

  it('drops out-of-order responses — slow earlier call must not overwrite fast later call', async () => {
    const d1 = defer<Item[]>();
    const d2 = defer<Item[]>();
    const loader = vi.fn()
      .mockImplementationOnce(() => d1.promise)
      .mockImplementationOnce(() => d2.promise);
    const wrapper = mountAsync(loader);
    const input = wrapper.get('[role="combobox"]');

    await input.setValue('a');
    await vi.advanceTimersByTimeAsync(250);
    await input.setValue('ab');
    await vi.advanceTimersByTimeAsync(250);

    d2.resolve([{ id: 2, label: 'B-result' }]);
    await flushPromises();
    d1.resolve([{ id: 1, label: 'A-result' }]);
    await flushPromises();

    const labels = wrapper.findAll('[role="option"]').map((o) => o.text());
    expect(labels).toEqual(['B-result']);
  });

  it('renders idle / loading / error / ready states distinctly', async () => {
    const d1 = defer<Item[]>();
    const loader = vi.fn().mockImplementationOnce(() => d1.promise);
    const wrapper = mountAsync(loader);
    const input = wrapper.get('[role="combobox"]');

    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.findAll('[role="option"]')).toHaveLength(0);

    await input.setValue('q');
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();
    expect(wrapper.find('[role="status"]').text()).toContain('Loading');

    d1.resolve([{ id: 1, label: 'Result' }]);
    await flushPromises();
    expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual(['Result']);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    const d2 = defer<Item[]>();
    loader.mockImplementationOnce(() => d2.promise);
    await input.setValue('qq');
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();
    d2.reject(new Error('boom'));
    await flushPromises();
    expect(wrapper.find('[role="status"]').text()).toContain('boom');
  });

  it('cancels in-flight requests on unmount', async () => {
    let signal: AbortSignal | null = null;
    const loader = vi.fn((_q: string, s: AbortSignal) => {
      signal = s;
      return new Promise<Item[]>(() => {});
    });
    const wrapper = mountAsync(loader);
    const input = wrapper.get('[role="combobox"]');
    await input.setValue('a');
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();
    expect(signal).not.toBeNull();
    expect(signal!.aborted).toBe(false);
    wrapper.unmount();
    expect(signal!.aborted).toBe(true);
  });
});
