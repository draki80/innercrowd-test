import { defineStore } from 'pinia';
import { ref } from 'vue';
import { countries } from '../api/countries';
import type { Country } from '../api/countries';

export const useCountriesStore = defineStore('countries', () => {
  const all = ref<Country[]>(countries);
  const selected = ref<Country | null>(null);

  return { all, selected };
});
