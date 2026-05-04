<script setup lang="ts">
import { SearchableSelect, type Loader } from '../lib/SearchableSelect';
import { fetchUsers, type User } from '../api/users';
import { useCountriesStore } from '../stores/countries';
import { useUsersStore } from '../stores/users';

const countriesStore = useCountriesStore();
const usersStore = useUsersStore();

// Standard async loader: routes through the store action.
const userLoader: Loader<User> = (q, signal) => usersStore.search(q, signal);

// Demo-specific scenario wrappers. These call the API directly with options
// to simulate conditions (high jitter, forced failure) that the real store
// action wouldn't expose. They demonstrate that the API layer is the single
// place where this kind of behavior is configured.
const raceLoader: Loader<User> = (q, signal) =>
  fetchUsers(q, signal, { latencyMs: () => 100 + Math.random() * 1400 });

const errorLoader: Loader<User> = (q, signal) =>
  fetchUsers(q, signal, { fail: true });
</script>

<template>
  <main>
    <header>
      <h1>SearchableSelect</h1>
      <p class="subtitle">
        A reusable, accessible, generic combobox for Vue 3. The same component below, four configurations.
      </p>
      <p class="meta">
        Selections live in Pinia stores (<code>useCountriesStore</code>, <code>useUsersStore</code>);
        loaders call the API layer at <code>src/api/</code>.
      </p>
    </header>

    <section>
      <header class="section-head">
        <h2>1. Sync mode</h2>
        <span class="tag">in-memory filter · 28 items</span>
      </header>
      <p>Filters in-memory as you type. No network. Open with <kbd>↓</kbd> to see all options.</p>
      <SearchableSelect
        v-model="countriesStore.selected"
        :options="countriesStore.all"
        :get-value="(c) => c.code"
        :get-label="(c) => c.name"
        placeholder="Filter countries…"
      />
      <p class="result">
        Selected: <code>{{ countriesStore.selected ? `${countriesStore.selected.name} (${countriesStore.selected.code})` : '—' }}</code>
      </p>
    </section>

    <section>
      <header class="section-head">
        <h2>2. Async mode</h2>
        <span class="tag">200–700ms latency · debounced 250ms</span>
      </header>
      <p>
        Loader is debounced 250ms. Each request has 200–700ms simulated latency. A monotonic request-ID guard
        ensures stale responses never overwrite the latest results. The loader is the store's
        <code>search</code> action.
      </p>
      <SearchableSelect
        v-model="usersStore.selected"
        :loader="userLoader"
        :get-value="(u) => u.id"
        :get-label="(u) => u.name"
        :debounce-ms="250"
        :min-query-length="1"
        placeholder="Search users…"
      >
        <template #option="{ item }">
          <div class="user-row">
            <span class="user-name">{{ item.name }}</span>
            <span class="user-meta">{{ item.email }} · {{ item.team }}</span>
          </div>
        </template>
      </SearchableSelect>
      <p class="result">
        Selected: <code>{{ usersStore.selected ? `${usersStore.selected.name} <${usersStore.selected.email}>` : '—' }}</code>
      </p>
    </section>

    <section>
      <header class="section-head">
        <h2>3. Race-condition stress test</h2>
        <span class="tag">100–1500ms random · debounced 100ms</span>
      </header>
      <p>
        Random per-call latency means responses frequently arrive out of order. Without the request-ID
        guard, an earlier slow response would clobber the latest results. Type quickly: only the latest
        query's results render.
      </p>
      <SearchableSelect
        v-model="usersStore.selectedRace"
        :loader="raceLoader"
        :get-value="(u) => u.id"
        :get-label="(u) => u.name"
        :debounce-ms="100"
        placeholder="Type quickly: 'a', 'al', 'ali'…"
      />
      <p class="result">
        Selected: <code>{{ usersStore.selectedRace?.name ?? '—' }}</code>
      </p>
    </section>

    <section>
      <header class="section-head">
        <h2>4. Error state</h2>
        <span class="tag">loader always rejects</span>
      </header>
      <p>
        The loader rejects after 400ms. The component surfaces the message in an
        <code>aria-live="polite"</code> region instead of leaving the dropdown silently empty.
      </p>
      <SearchableSelect
        v-model="usersStore.selectedError"
        :loader="errorLoader"
        :get-value="(u) => u.id"
        :get-label="(u) => u.name"
        placeholder="Type anything…"
      />
      <p class="result">
        Selected: <code>{{ usersStore.selectedError?.name ?? '—' }}</code>
      </p>
    </section>

    <footer>
      <h2>Keyboard map</h2>
      <table>
        <thead>
          <tr><th>Key</th><th>Behavior</th></tr>
        </thead>
        <tbody>
          <tr><td><kbd>↓</kbd> / <kbd>↑</kbd></td><td>Open dropdown · move highlight</td></tr>
          <tr><td><kbd>Home</kbd> / <kbd>End</kbd></td><td>Highlight first / last option</td></tr>
          <tr><td><kbd>Enter</kbd></td><td>Select highlighted option</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Close · restore input to selected label</td></tr>
          <tr><td><kbd>Tab</kbd></td><td>Close without selecting (manual-selection APG variant)</td></tr>
        </tbody>
      </table>
    </footer>
  </main>
</template>

<style scoped>
main {
  max-width: 720px;
  margin: 3rem auto;
  padding: 0 1.5rem 4rem;
  display: grid;
  gap: 2.5rem;
}

header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.875rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.subtitle {
  margin: 0 0 0.5rem;
  color: color-mix(in srgb, currentColor 65%, transparent);
}

.meta {
  margin: 0;
  color: color-mix(in srgb, currentColor 50%, transparent);
  font-size: 0.8125rem;
}

section {
  display: grid;
  gap: 0.75rem;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 0;
}

.section-head h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.tag {
  font-size: 0.75rem;
  color: color-mix(in srgb, currentColor 55%, transparent);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

section p {
  margin: 0;
  color: color-mix(in srgb, currentColor 70%, transparent);
  font-size: 0.9375rem;
}

.result {
  font-size: 0.875rem;
  color: color-mix(in srgb, currentColor 60%, transparent);
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: color-mix(in srgb, currentColor 8%, transparent);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
}

.user-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.user-name {
  font-weight: 500;
}

.user-meta {
  font-size: 0.8125rem;
  color: color-mix(in srgb, currentColor 60%, transparent);
}

footer {
  border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  padding-top: 1.5rem;
}

footer h2 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 600;
}

table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.875rem;
}

th, td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}

th {
  font-weight: 600;
}

kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  border-bottom-width: 2px;
  border-radius: 0.25rem;
  background: color-mix(in srgb, currentColor 5%, transparent);
}
</style>
