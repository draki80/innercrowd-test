export type Loader<T> = (query: string, signal: AbortSignal) => Promise<T[]>;

export type ListState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; error: Error }
  | { kind: 'ready'; items: T[] };

export type SearchableSelectProps<T> = {
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
};
