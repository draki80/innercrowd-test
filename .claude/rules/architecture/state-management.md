# State management — required idioms

Where state lives in this project: when to use component-local state, when to use Pinia, and how the API/repository layer fits in.

## Default: component-local state

Most state is component-local. Use `ref` / `reactive` / `computed` inside `<script setup>` for:

- **Interaction state** — open/close, focus, highlight index, hover, drag-in-progress, the cursor position in a date picker.
- **Form / input draft state** — query string, the value being edited, validation hints not yet committed.
- **Async lifecycle of *this component's own* request** — its idle / loading / error / ready `ListState`.
- **One-off page state** that no other component reads.

These are presentational concerns. Lifting them into a store is over-engineering: it makes the component harder to test, harder to embed in a different page, and couples its lifecycle to a global object.

The SearchableSelect's `open`, `query`, `highlightIndex`, and the async query's `ListState` belong inside the component for exactly these reasons.

## Reach for Pinia when state is cross-cutting

Use a Pinia store when **at least one** is true:

1. **Multiple components read or write the same data** — navbar shows the current user; a search component selects them.
2. **The data outlives any single component** — authenticated user, theme, feature flags, persisted cart.
3. **The data is fetched once and reused** — avoiding a refetch every time a component mounts.
4. **Domain logic deserves its own home**, separate from any specific component that consumes it.

If you can't articulate one of those, use component state.

## Repository / API layer is separate from the store

Stores are not the API. Put fetch/persist code in `src/api/` and have stores call it.

```
src/api/users.ts        — knows HOW to fetch users (URL, request shape, mocking). Stateless. Plain async functions.
src/stores/users.ts     — knows WHAT THE APP DOES with users (selection, derived state, optional cache). Reactive.
```

Two reasons:

1. Swapping the mock for a real fetch shouldn't touch any component or store. Replace the body of `fetchUsers` and you're done.
2. The store is testable without HTTP/mock setup; the API is testable without Vue/Pinia.

API functions take primitive args (a query string, an `AbortSignal`) and return data. **No reactivity inside the API layer.** Every API function honors the `AbortSignal` it's given.

## Store style: setup syntax

Always use the **setup syntax** for stores. It mirrors `<script setup>` and gives full TypeScript inference without ceremony.

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as usersApi from '../api/users';
import type { User } from '../api/users';

export const useUsersStore = defineStore('users', () => {
  const selected = ref<User | null>(null);

  function search(query: string, signal: AbortSignal) {
    return usersApi.fetchUsers(query, signal);
  }

  return { selected, search };
});
```

Avoid the **options syntax** (`defineStore({ state, getters, actions })`) — it's the legacy Vuex shape and offers no upside.

## Naming

- Store hook: `useXxxStore` where `Xxx` is the resource (noun): `useUsersStore`, `useCartStore`, `useAuthStore`. Not `useUserData`, `useUserState`, `useUserSlice`.
- Selection state: `selected` (single) or `selectedIds` (multi). Not `current`, `active`, `chosen`.
- Store id (first arg to `defineStore`): the resource name, lowercase: `'users'`, not `'usersStore'`.

## What does NOT belong in a Pinia store

- ❌ Combobox internals (open/close, query, highlight index). Component state.
- ❌ Form draft values being edited. Component state until submitted; submit triggers a store action with the final value.
- ❌ One-off transient UI state (dialog open, hover preview). Component state.
- ❌ A copy of a value that already lives in another store. One source of truth per fact.

## Anti-patterns

- ❌ Persisting Pinia state to localStorage by default. Add it deliberately for the slices that need it (theme, auth tokens with appropriate security review). Don't persist transient UI state.
- ❌ Pinia plugins that wrap every action in try/catch and surface errors globally. Errors belong with the caller; global error handling masks bugs.
- ❌ Passing the store down as a prop. Components import the store hook directly inside `<script setup>`.
- ❌ Making the API layer reactive. API modules export plain async functions; reactivity lives in stores and components.
- ❌ A "store action" whose only job is to call an API method with the same arguments. That's a hint the store doesn't carry its weight yet — either remove the action (call the API directly from the component) or add the cross-cutting logic (caching, auth headers, query history) that justifies its existence.
