import { computed, ref, type ComputedRef, type Ref } from 'vue';

export type UseListNavigationReturn<T> = {
  highlightIndex: Ref<number>;
  highlightedItem: ComputedRef<T | null>;
  reset: () => void;
  moveDown: () => void;
  moveUp: () => void;
  moveFirst: () => void;
  moveLast: () => void;
  setHighlight: (index: number) => void;
};

export function useListNavigation<T>(
  items: Readonly<Ref<readonly T[]>>,
): UseListNavigationReturn<T> {
  const highlightIndex = ref<number>(-1);

  const highlightedItem = computed<T | null>(() => {
    if (highlightIndex.value < 0) return null;
    return items.value[highlightIndex.value] ?? null;
  });

  function clamp(i: number): number {
    const max = items.value.length - 1;
    if (max < 0) return -1;
    if (i < 0) return 0;
    if (i > max) return max;
    return i;
  }

  return {
    highlightIndex,
    highlightedItem,
    reset() {
      highlightIndex.value = -1;
    },
    moveDown() {
      if (items.value.length === 0) return;
      highlightIndex.value = clamp(highlightIndex.value < 0 ? 0 : highlightIndex.value + 1);
    },
    moveUp() {
      if (items.value.length === 0) return;
      highlightIndex.value = clamp(highlightIndex.value < 0 ? items.value.length - 1 : highlightIndex.value - 1);
    },
    moveFirst() {
      if (items.value.length === 0) return;
      highlightIndex.value = 0;
    },
    moveLast() {
      if (items.value.length === 0) return;
      highlightIndex.value = items.value.length - 1;
    },
    setHighlight(index: number) {
      highlightIndex.value = clamp(index);
    },
  };
}
