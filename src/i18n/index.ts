import { ref, watch } from 'vue'
import { storage } from '@/utils/storage'
import { vi } from './vi'

export type Locale = 'vi' | 'en'

export const locales: { key: Locale; label: string; short: string }[] = [
  { key: 'vi', label: 'Tiếng Việt', short: 'VI' },
  { key: 'en', label: 'English', short: 'EN' },
]

const LOCALE_KEY = 'locale'

/** The visitor's language. Vietnamese unless they picked English on this device. */
export const locale = ref<Locale>(storage.get(LOCALE_KEY) === 'en' ? 'en' : 'vi')

watch(
  locale,
  (l) => {
    storage.set(LOCALE_KEY, l)
    document.documentElement.lang = l
  },
  { immediate: true },
)

/**
 * Checks from pages with unsaved edits. Switching language reloads the page's data (shop
 * content comes from the API in the chosen language), so the switch asks first.
 */
export const unsavedChanges = new Set<() => boolean>()

/** Switches language unless the reader cancels to keep unsaved edits. */
export function setLocale(next: Locale): boolean {
  if (next === locale.value) return true
  if ([...unsavedChanges].some((isDirty) => isDirty()) && !confirm(t('You have unsaved changes. Leave without saving?'))) return false
  locale.value = next
  return true
}

export type TranslateParams = Record<string, string | number>

/**
 * Translates English source text into the current language; the text itself is the key, so
 * English needs no dictionary. `{name}` placeholders are filled from `params`. Reading
 * `locale` here makes templates and computeds re-render when the language changes.
 */
export function t(text: string, params?: TranslateParams): string {
  let out = text
  if (locale.value === 'vi') {
    const translated = vi[text]
    if (translated !== undefined) out = translated
    else if (import.meta.env.DEV) console.warn(`[i18n] missing vi: ${JSON.stringify(text)}`)
  }
  if (params) out = out.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match))
  return out
}

/**
 * Shop content kept in both languages (admin receives both): the English for English readers,
 * otherwise, or when there is none, the Vietnamese. The storefront API already picks for you.
 */
export function pick(vi: string, en: string | null | undefined): string
export function pick(vi: string | null, en: string | null | undefined): string | null
export function pick(vi: string | null, en: string | null | undefined): string | null {
  return locale.value === 'en' && en?.trim() ? en : vi
}

/** BCP 47 tag for Intl formatters. */
export function intlLocale(): string {
  return locale.value === 'vi' ? 'vi-VN' : 'en-GB'
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: typeof t
  }
}
