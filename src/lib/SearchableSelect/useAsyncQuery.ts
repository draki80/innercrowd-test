import { debounce, type DebouncedFunc } from 'lodash-es';
import { onScopeDispose, ref, shallowRef, type ShallowRef } from 'vue';
import type { ListState, Loader } from './types';

export type UseAsyncQueryOptions = {
  debounceMs?: number;
  loadOnEmpty?: boolean;
  minQueryLength?: number;
};

export type UseAsyncQueryReturn<T> = {
  state: ShallowRef<ListState<T>>;
  run: (query: string) => void;
  cancel: () => void;
};

export function useAsyncQuery<T>(
  loader: Loader<T>,
  opts: UseAsyncQueryOptions = {},
): UseAsyncQueryReturn<T> {
  const debounceMs = opts.debounceMs ?? 250;
  const loadOnEmpty = opts.loadOnEmpty ?? false;
  const minQueryLength = opts.minQueryLength ?? 0;

  const state = shallowRef<ListState<T>>({ kind: 'idle' });
  const seq = ref(0);
  let controller: AbortController | null = null;

  async function execute(query: string): Promise<void> {
    const id = ++seq.value;
    if (controller !== null) controller.abort();
    controller = new AbortController();
    state.value = { kind: 'loading' };
    try {
      const items = await loader(query, controller.signal);
      if (id !== seq.value) return;
      state.value = { kind: 'ready', items };
    } catch (e) {
      if (id !== seq.value) return;
      if (e instanceof DOMException && e.name === 'AbortError') return;
      state.value = {
        kind: 'error',
        error: e instanceof Error ? e : new Error(String(e)),
      };
    }
  }

  const debouncedExecute: DebouncedFunc<typeof execute> = debounce(execute, debounceMs);

  function cancel(): void {
    debouncedExecute.cancel();
    if (controller !== null) {
      controller.abort();
      controller = null;
    }
  }

  function run(query: string): void {
    if (!loadOnEmpty && query === '') {
      cancel();
      state.value = { kind: 'idle' };
      return;
    }
    if (query.length < minQueryLength) {
      cancel();
      state.value = { kind: 'idle' };
      return;
    }
    debouncedExecute(query);
  }

  onScopeDispose(cancel);

  return { state, run, cancel };
}
