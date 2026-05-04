import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as usersApi from '../api/users';
import type { User } from '../api/users';

export const useUsersStore = defineStore('users', () => {
  // Selection state. In a real app, only `selected` would exist; the
  // race/error variants are demo-only and could equally be component-local.
  const selected = ref<User | null>(null);
  const selectedRace = ref<User | null>(null);
  const selectedError = ref<User | null>(null);

  // Thin pass-through to the API. Realistic store action: in a real app,
  // this is where caching, auth headers, or query-history tracking would go.
  function search(query: string, signal: AbortSignal): Promise<User[]> {
    return usersApi.fetchUsers(query, signal);
  }

  return { selected, selectedRace, selectedError, search };
});
