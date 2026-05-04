import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import SearchableSelect from './SearchableSelect.vue';
import type { Loader } from './types';

type Country = { code: string; name: string };
type User = { id: number; name: string; email: string; team: string };

const countries: Country[] = [
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CN', name: 'China' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DE', name: 'Germany' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GR', name: 'Greece' },
  { code: 'HR', name: 'Croatia' },
  { code: 'IN', name: 'India' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SE', name: 'Sweden' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'United States' },
  { code: 'ZA', name: 'South Africa' },
];

const users: User[] = [
  { id: 1,  name: 'Ada Lovelace',      email: 'ada@example.com',     team: 'Platform' },
  { id: 2,  name: 'Alan Turing',       email: 'alan@example.com',    team: 'Research' },
  { id: 3,  name: 'Anita Borg',        email: 'anita@example.com',   team: 'Platform' },
  { id: 4,  name: 'Barbara Liskov',    email: 'barbara@example.com', team: 'Platform' },
  { id: 5,  name: 'Bjarne Stroustrup', email: 'bjarne@example.com',  team: 'Platform' },
  { id: 6,  name: 'Brendan Eich',      email: 'brendan@example.com', team: 'Web' },
  { id: 7,  name: 'Donald Knuth',      email: 'donald@example.com',  team: 'Research' },
  { id: 8,  name: 'Edsger Dijkstra',   email: 'edsger@example.com',  team: 'Research' },
  { id: 9,  name: 'Evan You',          email: 'evan@example.com',    team: 'Web' },
  { id: 10, name: 'Grace Hopper',      email: 'grace@example.com',   team: 'Platform' },
  { id: 11, name: 'Linus Torvalds',    email: 'linus@example.com',   team: 'Platform' },
  { id: 12, name: 'Tim Berners-Lee',   email: 'tim@example.com',     team: 'Web' },
];

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

// Note: `SearchableSelect` is a generic component (`generic="T"`); Storybook's
// `Meta<typeof Component>` doesn't infer cleanly through generics. We loosen
// the meta type — render-function-based stories don't need full arg typing.
const meta: Meta = {
  title: 'Library/SearchableSelect',
  component: SearchableSelect as never,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A reusable, accessible, generic combobox for Vue 3. Implements the WAI-ARIA APG combobox-with-listbox-popup pattern with full keyboard support. Accepts either a synchronous `T[]` or an async `loader(query, signal) => Promise<T[]>` with debounce, cancellation, and out-of-order response handling.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Sync: Story = {
  name: 'Sync mode',
  parameters: {
    docs: {
      description: {
        story: 'Filters an in-memory array. Open with ↓ to see all options.',
      },
    },
  },
  render: () => ({
    components: { SearchableSelect },
    setup() {
      const selected = ref<Country | null>(null);
      return { selected, countries };
    },
    template: `
      <div style="width: 320px;">
        <SearchableSelect
          v-model="selected"
          :options="countries"
          :get-value="(c) => c.code"
          :get-label="(c) => c.name"
          placeholder="Filter countries…"
        />
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
          Selected: <code>{{ selected ? selected.name + ' (' + selected.code + ')' : '—' }}</code>
        </p>
      </div>
    `,
  }),
};

export const Async: Story = {
  name: 'Async mode',
  parameters: {
    docs: {
      description: {
        story:
          'Async loader simulating 200–700ms latency, debounced 250ms. Custom slot renders a two-line user row.',
      },
    },
  },
  render: () => ({
    components: { SearchableSelect },
    setup() {
      const selected = ref<User | null>(null);
      const loader: Loader<User> = async (q, signal) => {
        await delay(200 + Math.random() * 500, signal);
        const ql = q.toLowerCase();
        return users.filter(
          (u) =>
            u.name.toLowerCase().includes(ql) ||
            u.email.toLowerCase().includes(ql) ||
            u.team.toLowerCase().includes(ql),
        );
      };
      return { selected, loader };
    },
    template: `
      <div style="width: 320px;">
        <SearchableSelect
          v-model="selected"
          :loader="loader"
          :get-value="(u) => u.id"
          :get-label="(u) => u.name"
          :debounce-ms="250"
          :min-query-length="1"
          placeholder="Search users…"
        >
          <template #option="{ item }">
            <div>
              <strong>{{ item.name }}</strong>
              <div style="font-size: 0.8125rem; color: #666;">{{ item.email }} · {{ item.team }}</div>
            </div>
          </template>
        </SearchableSelect>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
          Selected: <code>{{ selected ? selected.name + ' <' + selected.email + '>' : '—' }}</code>
        </p>
      </div>
    `,
  }),
};

export const RaceCondition: Story = {
  name: 'Race-condition stress test',
  parameters: {
    docs: {
      description: {
        story:
          'Random latency 100–1500ms with debounce 100ms. Out-of-order responses are common but stale results never overwrite the latest, thanks to the monotonic request-ID guard in `useAsyncQuery`.',
      },
    },
  },
  render: () => ({
    components: { SearchableSelect },
    setup() {
      const selected = ref<User | null>(null);
      const loader: Loader<User> = async (q, signal) => {
        await delay(100 + Math.random() * 1400, signal);
        const ql = q.toLowerCase();
        return users.filter((u) => u.name.toLowerCase().includes(ql));
      };
      return { selected, loader };
    },
    template: `
      <div style="width: 320px;">
        <SearchableSelect
          v-model="selected"
          :loader="loader"
          :get-value="(u) => u.id"
          :get-label="(u) => u.name"
          :debounce-ms="100"
          placeholder="Type quickly: 'a', 'al', 'ali'…"
        />
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
          Selected: <code>{{ selected?.name ?? '—' }}</code>
        </p>
      </div>
    `,
  }),
};

export const ErrorState: Story = {
  name: 'Error state',
  parameters: {
    docs: {
      description: {
        story:
          'Loader rejects after 400ms. The error renders in an `aria-live="polite"` region rather than leaving the dropdown silently empty.',
      },
    },
  },
  render: () => ({
    components: { SearchableSelect },
    setup() {
      const selected = ref<User | null>(null);
      const loader: Loader<User> = async (_q, signal) => {
        await delay(400, signal);
        throw new Error('Backend unavailable (demo)');
      };
      return { selected, loader };
    },
    template: `
      <div style="width: 320px;">
        <SearchableSelect
          v-model="selected"
          :loader="loader"
          :get-value="(u) => u.id"
          :get-label="(u) => u.name"
          placeholder="Type anything…"
        />
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
          Selected: <code>{{ selected?.name ?? '—' }}</code>
        </p>
      </div>
    `,
  }),
};
