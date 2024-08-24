import { ref } from 'vue';
import en from './locales/en.json';
import ru from './locales/ru.json';

type Locale = 'en' | 'ru';

interface Messages {
  [key: string]: string;
}

const messages: Record<Locale, Messages> = {
  en,
  ru,
};

const LOCALE_STORAGE_KEY = 'who-am-i-locale';
const currentLocale = ref<Locale>(
  (localStorage.getItem(LOCALE_STORAGE_KEY) as Locale) || 'en'
);

export function getLocaleText(key: string): string {
  return messages[currentLocale.value][key] || key;
}

export function switchToNextLocale(): void {
  const locales: Locale[] = Object.keys(messages) as Locale[];
  const currentIndex = locales.indexOf(currentLocale.value);
  const nextIndex = (currentIndex + 1) % locales.length;
  const locale = locales[nextIndex];
  currentLocale.value = locale;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}
