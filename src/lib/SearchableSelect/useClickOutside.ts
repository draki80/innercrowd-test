import { onBeforeUnmount, onMounted, type Ref } from 'vue';

export function useClickOutside(
  rootRef: Ref<HTMLElement | null>,
  onOutside: () => void,
): void {
  function handler(event: PointerEvent) {
    const root = rootRef.value;
    if (!root) return;
    if (event.composedPath().includes(root)) return;
    onOutside();
  }

  onMounted(() => {
    document.addEventListener('pointerdown', handler);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', handler);
  });
}
