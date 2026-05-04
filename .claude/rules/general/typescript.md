# TypeScript — project-specific patterns

Generic "no `any`, no `!`" guidance lives in `anti-patterns.md`. This file pins the project decisions that aren't default and aren't covered there.

## tsconfig (the contract)
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are off by default — keep them on. Don't propose a `tsconfig` that relaxes them.

## Generic components — consumer-passed accessors
Reusable components generic over a data type `T` expose **accessor functions**, never hardcoded key names. The consumer knows the shape of their data; the component does not.

```ts
type SelectProps<T> = {
  modelValue: T | null;
  options?: T[];                                                     // sync
  loader?: (query: string, signal: AbortSignal) => Promise<T[]>;     // async
  getValue: (item: T) => string | number;
  getLabel: (item: T) => string;
};
```

`getValue` / `getLabel` are required. Don't bake in `.id` / `.label` / `.name` — different APIs return different shapes.

## Discriminated unions for state
Component state with multiple modes is a discriminated union, not a bag of booleans:

```ts
type ListState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; error: Error }
  | { kind: 'ready'; items: T[] };
```

This makes "loading + error both true" *unrepresentable*. Templates branch on `state.kind`; TS narrows automatically inside each branch. Used by the SearchableSelect's `ListState`; reuse the pattern for any new component with idle/loading/error/ready semantics.
