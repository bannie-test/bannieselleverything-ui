<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { ColorMode, CornerStyle, FontFamily, SaveShopSettings, ShopSettings, SidebarPosition, SidebarStyle } from '@/api/types'
import BilingualField from '@/components/BilingualField.vue'
import ColorField from '@/components/ColorField.vue'
import ImageField from '@/components/ImageField.vue'
import { pick, t, unsavedChanges } from '@/i18n'
import { useAdminStore } from '@/stores/admin'
import { useTenantStore } from '@/stores/tenant'
import { money } from '@/utils/format'
import { sidebarDefaults } from '@/utils/sidebar'
import { colorModeClass, cornerStyles, fonts, loadFont, themeVars } from '@/utils/theme'

type Tab = 'general' | 'theme' | 'sidebar'

const admin = useAdminStore()
const tenant = useTenantStore()

const tab = ref<Tab>('general')
const loaded = ref<ShopSettings | null>(null)
const form = ref<SaveShopSettings | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const saved = ref(false)

const tabs: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'theme', label: 'Theme' },
  { key: 'sidebar', label: 'Admin menu' },
]

function toForm(s: ShopSettings): SaveShopSettings {
  const { slug: _slug, currency: _currency, ...rest } = structuredClone(s)
  return rest
}

onMounted(async () => {
  try {
    loaded.value = (await http.get<ShopSettings>('/admin/settings')).data
    form.value = toForm(loaded.value)
  } catch (e) {
    error.value = errorMessage(e)
  }
})

const dirty = computed(() => !!form.value && !!loaded.value && JSON.stringify(form.value) !== JSON.stringify(toForm(loaded.value)))
watch(dirty, (d) => d && (saved.value = false))

onBeforeRouteLeave(() => !dirty.value || confirm(t('You have unsaved changes. Leave without saving?')))
const isDirty = () => dirty.value
unsavedChanges.add(isDirty)
onUnmounted(() => unsavedChanges.delete(isDirty))

// Fonts are loaded as they're picked so the preview shows them.
watch(() => form.value?.appearance.fontFamily, (f) => f && loadFont(f))

const previewStyle = computed(() => {
  const f = form.value
  if (!f) return {}
  return themeVars({ primaryColor: f.primaryColor, ...f.appearance })
})

const fontOptions = Object.entries(fonts) as [FontFamily, (typeof fonts)[FontFamily]][]
const cornerOptions = Object.entries(cornerStyles) as [CornerStyle, (typeof cornerStyles)[CornerStyle]][]
const colorModes: { key: ColorMode; label: string; hint: string }[] = [
  { key: 'light', label: 'Light', hint: 'Dark text on light backgrounds.' },
  { key: 'dark', label: 'Dark', hint: 'Light text on dark backgrounds.' },
  { key: 'system', label: 'Automatic', hint: "Follows each visitor's device setting." },
]
const sidebarStyles: { key: SidebarStyle; label: string; swatch: string }[] = [
  { key: 'dark', label: 'Dark', swatch: 'bg-stone-900' },
  { key: 'light', label: 'Light', swatch: 'bg-white border border-stone-300' },
  { key: 'brand', label: 'Brand color', swatch: 'bg-primary' },
]
/** `bar` sketches where the menu sits in the icon. */
const sidebarPositions: { key: SidebarPosition; label: string; bar: string }[] = [
  { key: 'left', label: 'Left', bar: 'inset-y-0 left-0 w-2.5' },
  { key: 'right', label: 'Right', bar: 'inset-y-0 right-0 w-2.5' },
  { key: 'top', label: 'Top', bar: 'inset-x-0 top-0 h-2' },
]
const previewSidebar = computed(() => {
  const a = form.value?.appearance
  if (!a) return null
  return {
    aside: { dark: 'bg-stone-900 text-stone-300', light: 'bg-white text-stone-700', brand: 'bg-primary text-on-primary' }[a.sidebarStyle],
    active: { dark: 'bg-stone-800 text-white', light: 'bg-primary/10 text-primary', brand: 'bg-black/20' }[a.sidebarStyle],
    rule: { dark: 'border-stone-800', light: 'border-stone-200', brand: 'border-black/15' }[a.sidebarStyle],
  }
})

function move(index: number, delta: number) {
  const items = form.value!.appearance.sidebarItems
  const target = index + delta
  if (target < 0 || target >= items.length) return
  ;[items[index], items[target]] = [items[target]!, items[index]!]
}

async function save() {
  if (!form.value) return
  saving.value = true
  error.value = null
  errors.value = {}
  try {
    const { data } = await http.put<ShopSettings>('/admin/settings', form.value)
    loaded.value = data
    form.value = toForm(data)
    admin.settings = data
    saved.value = true
    await tenant.refresh()
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? t('Please fix the highlighted fields.') : errorMessage(e)
  } finally {
    saving.value = false
  }
}

function reset() {
  if (loaded.value) form.value = toForm(loaded.value)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-2xl font-semibold">{{ $t('Settings') }}</h1>
      <p v-if="loaded" class="text-sm text-stone-500">{{ loaded.slug }} · {{ $t('prices in {currency}', { currency: loaded.currency }) }}</p>
    </div>
    <div v-if="form && admin.isOwner" class="flex items-center gap-2">
      <span v-if="dirty" class="text-sm text-amber-700">{{ $t('Unsaved changes') }}</span>
      <button v-if="dirty" class="btn btn-secondary" :disabled="saving" @click="reset">{{ $t('Discard') }}</button>
      <button class="btn btn-primary" :disabled="saving || !dirty" @click="save">{{ saving ? $t('Saving…') : $t('Save settings') }}</button>
    </div>
  </div>

  <p v-if="!admin.isOwner && form" class="alert-warning mt-4">{{ $t("Only the shop owner can change settings. You're viewing them read-only.") }}</p>
  <p v-if="error" class="alert-error mt-4">{{ error }}</p>
  <p v-if="saved && !dirty" class="alert-success mt-4">{{ $t('Settings saved. The storefront now uses them.') }}</p>

  <div v-if="!form && !error" class="mt-6 h-96 animate-pulse rounded-xl bg-stone-200" />

  <template v-if="form">
    <div class="mt-6 inline-flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1" role="tablist">
      <button v-for="t in tabs" :key="t.key" role="tab" :aria-selected="tab === t.key" :class="tab === t.key ? 'tab-active' : ''" class="tab" @click="tab = t.key">
        {{ $t(t.label) }}
      </button>
    </div>

    <fieldset :disabled="!admin.isOwner" class="mt-6">
      <!-- General -->
      <div v-if="tab === 'general'" class="grid max-w-3xl gap-6">
        <section class="card space-y-4 p-5">
          <h2 class="font-semibold">{{ $t('Shop profile') }}</h2>
          <BilingualField id="name" v-model:vi="form.name" v-model:en="form.nameEn" :label="$t('Shop name')" required :maxlength="200" :error="errors.name" :error-en="errors.nameEn" />
          <ImageField id="logo" v-model="form.logoUrl" :label="$t('Logo')" :hint="$t('Square images look best. Shown next to the shop name.')" :error="errors.logoUrl" />
        </section>
        <section class="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 class="font-semibold sm:col-span-2">{{ $t('Contact & shipping') }}</h2>
          <div>
            <label for="email" class="label">{{ $t('Contact email') }}</label>
            <input id="email" v-model="form.contactEmail" type="email" :class="{ 'input-error': errors.contactEmail }" class="input" />
            <p v-if="errors.contactEmail" class="field-error">{{ errors.contactEmail }}</p>
          </div>
          <div>
            <label for="phone" class="label">{{ $t('Contact phone') }}</label>
            <input id="phone" v-model="form.contactPhone" class="input" />
          </div>
          <div class="sm:col-span-2">
            <label for="address" class="label">{{ $t('Address') }}</label>
            <input id="address" v-model="form.address" class="input" />
            <p class="hint">{{ $t('Shown in the storefront footer and on printed receipts.') }}</p>
          </div>
          <div>
            <label for="shipping" class="label">{{ $t('Flat shipping fee (₫)') }}</label>
            <input id="shipping" v-model.number="form.flatShippingMinor" type="number" min="0" step="1000" :class="{ 'input-error': errors.flatShippingMinor }" class="input" />
            <p class="hint">{{ form.flatShippingMinor ? $t('{amount} per order', { amount: money(form.flatShippingMinor) }) : $t('Free shipping on every order') }}</p>
          </div>
        </section>
        <section class="card space-y-4 p-5">
          <h2 class="font-semibold">{{ $t('Payment') }}</h2>
          <p class="text-sm">{{ $t('Cash on delivery is always available.') }}</p>
          <label class="flex items-center gap-2 text-sm font-medium">
            <input v-model="form.bankTransferEnabled" type="checkbox" class="h-4 w-4 accent-primary" />
            {{ $t('Accept bank transfers') }}
          </label>
          <div v-if="form.bankTransferEnabled" class="grid gap-4 rounded-lg bg-stone-50 p-4 sm:grid-cols-2">
            <div>
              <label for="bankName" class="label">{{ $t('Bank') }}</label>
              <input id="bankName" v-model="form.bankName" placeholder="Vietcombank" :class="{ 'input-error': errors.bankName }" class="input" />
              <p v-if="errors.bankName" class="field-error">{{ errors.bankName }}</p>
            </div>
            <div>
              <label for="bankAccountNumber" class="label">{{ $t('Account number') }}</label>
              <input id="bankAccountNumber" v-model="form.bankAccountNumber" :class="{ 'input-error': errors.bankAccountNumber }" class="input font-mono" />
              <p v-if="errors.bankAccountNumber" class="field-error">{{ errors.bankAccountNumber }}</p>
            </div>
            <div class="sm:col-span-2">
              <label for="bankAccountName" class="label">{{ $t('Account holder name') }}</label>
              <input id="bankAccountName" v-model="form.bankAccountName" :class="{ 'input-error': errors.bankAccountName }" class="input" />
              <p v-if="errors.bankAccountName" class="field-error">{{ errors.bankAccountName }}</p>
            </div>
            <p class="text-xs text-stone-500 sm:col-span-2">
              {{ $t('Customers see these details after ordering and use the order number as the transfer note. Confirm each payment from the order page.') }}
            </p>
          </div>
        </section>
      </div>

      <!-- Theme -->
      <div v-else-if="tab === 'theme'" class="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div class="space-y-6">
          <section class="card space-y-3 p-5">
            <div>
              <h2 class="font-semibold">{{ $t('Color mode') }}</h2>
              <p class="text-sm text-stone-500">{{ $t('Applies to the storefront and this admin.') }}</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-3">
              <label
                v-for="m in colorModes"
                :key="m.key"
                :class="form.appearance.colorMode === m.key ? 'border-primary ring-2 ring-primary/20' : 'border-stone-200 hover:border-stone-300'"
                class="flex cursor-pointer items-start gap-3 rounded-lg border bg-surface p-3 text-sm"
              >
                <input v-model="form.appearance.colorMode" type="radio" name="colorMode" :value="m.key" class="sr-only" />
                <span class="theme-light flex h-9 w-12 shrink-0 overflow-hidden rounded-md border border-stone-300" aria-hidden="true">
                  <span v-if="m.key !== 'dark'" class="flex-1 bg-white p-1"><span class="block h-1.5 w-5 rounded-sm bg-stone-800" /></span>
                  <span v-if="m.key !== 'light'" class="flex-1 bg-stone-900 p-1"><span class="block h-1.5 w-5 rounded-sm bg-stone-200" /></span>
                </span>
                <span>
                  <span class="block font-medium">{{ $t(m.label) }}</span>
                  <span class="text-xs text-stone-500">{{ $t(m.hint) }}</span>
                </span>
              </label>
            </div>
          </section>

          <section class="card grid gap-4 p-5 sm:grid-cols-2">
            <h2 class="font-semibold sm:col-span-2">{{ $t('Colors') }}</h2>
            <ColorField id="primary" v-model="form.primaryColor" :label="$t('Brand color')" :hint="$t('Buttons, links and the hero banner.')" :error="errors.primaryColor" />
            <ColorField id="accent" v-model="form.appearance.accentColor" :label="$t('Accent color')" :hint="$t('Sale badges and highlights.')" :error="errors['appearance.accentColor']" />
          </section>

          <section class="card space-y-4 p-5">
            <h2 class="font-semibold">{{ $t('Typography & shape') }}</h2>
            <div>
              <label for="font" class="label">{{ $t('Font') }}</label>
              <select id="font" v-model="form.appearance.fontFamily" class="input">
                <option v-for="[key, f] in fontOptions" :key="key" :value="key">{{ $t(f.label) }}</option>
              </select>
            </div>
            <div>
              <p class="label">{{ $t('Corners') }}</p>
              <div class="grid grid-cols-3 gap-2">
                <label
                  v-for="[key, c] in cornerOptions"
                  :key="key"
                  :class="form.appearance.cornerStyle === key ? 'border-primary ring-2 ring-primary/20' : 'border-stone-200 hover:border-stone-300'"
                  class="flex cursor-pointer flex-col items-center gap-2 border bg-surface p-3 text-sm"
                  :style="{ borderRadius: c.radii[2] }"
                >
                  <input v-model="form.appearance.cornerStyle" type="radio" :value="key" class="sr-only" />
                  <span class="h-6 w-14 bg-stone-800" :style="{ borderRadius: c.radii[1] }" />
                  {{ $t(c.label) }}
                </label>
              </div>
            </div>
          </section>

          <section class="card space-y-4 p-5">
            <h2 class="font-semibold">{{ $t('Home page & announcement') }}</h2>
            <BilingualField
              id="announcement"
              v-model:vi="form.appearance.announcementText"
              v-model:en="form.appearance.announcementTextEn"
              :label="$t('Announcement bar')"
              :maxlength="200"
              placeholder="Miễn phí vận chuyển cho đơn từ 500.000 ₫"
              placeholder-en="Free shipping on orders over 500.000 ₫"
              :error="errors['appearance.announcementText']"
              :error-en="errors['appearance.announcementTextEn']"
              :hint="$t('A thin bar above the header on every page. Leave empty to hide it.')"
            />
            <BilingualField
              id="heroTitle"
              v-model:vi="form.appearance.heroTitle"
              v-model:en="form.appearance.heroTitleEn"
              :label="$t('Hero title')"
              :maxlength="120"
              :placeholder="form.name"
              :placeholder-en="form.nameEn"
              :error="errors['appearance.heroTitle']"
              :error-en="errors['appearance.heroTitleEn']"
            />
            <BilingualField
              id="heroSubtitle"
              v-model:vi="form.appearance.heroSubtitle"
              v-model:en="form.appearance.heroSubtitleEn"
              :label="$t('Hero subtitle')"
              multiline
              :rows="2"
              :maxlength="300"
              :error="errors['appearance.heroSubtitle']"
              :error-en="errors['appearance.heroSubtitleEn']"
            />
            <ImageField
              id="heroImage"
              v-model="form.appearance.heroImageUrl"
              :label="$t('Hero image')"
              :hint="$t('Optional. Wide images (about 1600 × 600) work best; text sits on the left.')"
              :error="errors['appearance.heroImageUrl']"
            />
          </section>
        </div>

        <!-- Live preview: the same CSS variables the storefront uses, scoped to this box. -->
        <aside class="xl:sticky xl:top-6 xl:self-start">
          <p class="mb-2 text-sm font-medium text-stone-600">{{ $t('Preview') }}</p>
          <div :style="previewStyle" :class="colorModeClass(form.appearance.colorMode)" class="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 font-sans text-stone-900 shadow-sm">
            <div v-if="form.appearance.announcementText" class="bg-accent px-3 py-1.5 text-center text-xs font-medium text-on-accent">
              {{ pick(form.appearance.announcementText, form.appearance.announcementTextEn) }}
            </div>
            <div class="flex items-center gap-2 border-b border-stone-200 bg-surface px-3 py-2.5">
              <img v-if="form.logoUrl" :src="form.logoUrl" alt="" class="h-6 w-6 rounded" />
              <span class="font-bold text-primary">{{ pick(form.name, form.nameEn) || $t('Your shop') }}</span>
              <span class="ml-auto h-6 w-24 rounded-lg border border-stone-200 bg-stone-50" />
            </div>
            <div class="p-3">
              <div
                class="relative overflow-hidden rounded-2xl bg-primary bg-cover bg-center p-5 text-on-primary"
                :style="form.appearance.heroImageUrl ? { backgroundImage: `linear-gradient(90deg, rgb(0 0 0 / .55), rgb(0 0 0 / .1)), url(${form.appearance.heroImageUrl})`, color: '#fff' } : {}"
              >
                <p class="text-lg leading-tight font-bold">{{ pick(form.appearance.heroTitle, form.appearance.heroTitleEn) || pick(form.name, form.nameEn) }}</p>
                <p v-if="form.appearance.heroSubtitle" class="mt-1 text-xs opacity-90">{{ pick(form.appearance.heroSubtitle, form.appearance.heroSubtitleEn) }}</p>
                <span class="btn btn-sm mt-3 bg-surface text-stone-900">{{ $t('Shop now') }}</span>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <div v-for="i in 2" :key="i" class="overflow-hidden rounded-xl border border-stone-200 bg-surface">
                  <div class="relative aspect-[4/3] bg-stone-200">
                    <span v-if="i === 1" class="pill absolute top-1.5 left-1.5 bg-accent text-on-accent">−15%</span>
                  </div>
                  <div class="p-2">
                    <p class="text-xs font-medium">{{ $t('Sample product') }}</p>
                    <p class="text-sm font-semibold" :class="i === 1 ? 'text-red-600' : ''">{{ money(i === 1 ? 170000 : 290000) }}</p>
                  </div>
                </div>
              </div>
              <div class="mt-3 flex gap-2">
                <span class="btn btn-primary btn-sm">{{ $t('Add to cart') }}</span>
                <span class="btn btn-secondary btn-sm">{{ $t('Details') }}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- Sidebar -->
      <div v-else class="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div class="space-y-6">
          <section class="card space-y-4 p-5">
            <h2 class="font-semibold">{{ $t('Position') }}</h2>
            <div class="grid grid-cols-3 gap-2">
              <label
                v-for="s in sidebarPositions"
                :key="s.key"
                :class="form.appearance.sidebarPosition === s.key ? 'border-primary ring-2 ring-primary/20' : 'border-stone-200 hover:border-stone-300'"
                class="flex cursor-pointer items-center gap-2 rounded-lg border bg-surface p-3 text-sm"
              >
                <input v-model="form.appearance.sidebarPosition" type="radio" name="sidebarPosition" :value="s.key" class="sr-only" />
                <span class="relative h-8 w-10 shrink-0 overflow-hidden rounded border border-stone-300 bg-stone-50" aria-hidden="true">
                  <span :class="s.bar" class="absolute bg-primary" />
                </span>
                {{ $t(s.label) }}
              </label>
            </div>

            <h2 class="pt-2 font-semibold">{{ $t('Style') }}</h2>
            <div class="grid grid-cols-3 gap-2">
              <label
                v-for="s in sidebarStyles"
                :key="s.key"
                :class="form.appearance.sidebarStyle === s.key ? 'border-primary ring-2 ring-primary/20' : 'border-stone-200 hover:border-stone-300'"
                class="flex cursor-pointer items-center gap-2 rounded-lg border bg-surface p-3 text-sm"
              >
                <input v-model="form.appearance.sidebarStyle" type="radio" :value="s.key" class="sr-only" />
                <span :class="s.swatch" class="theme-light h-8 w-5 shrink-0 rounded" />
                {{ $t(s.label) }}
              </label>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.appearance.sidebarCompact" type="checkbox" class="h-4 w-4 accent-primary" />
              {{ $t('Compact — icons only on wide screens') }}
            </label>
          </section>

          <section class="card p-5">
            <h2 class="font-semibold">{{ $t('Menu items') }}</h2>
            <p class="text-sm text-stone-500">{{ $t('Reorder, rename or hide entries. Settings always stays visible so you can come back here.') }}</p>
            <ul class="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-200">
              <li v-for="(item, i) in form.appearance.sidebarItems" :key="item.key" class="flex flex-wrap items-center gap-3 px-3 py-2.5" :class="{ 'bg-stone-50': !item.visible }">
                <div class="flex flex-col">
                  <button type="button" class="px-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-30" :disabled="i === 0" :aria-label="$t('Move {name} up', { name: $t(sidebarDefaults[item.key].label) })" @click="move(i, -1)">▲</button>
                  <button type="button" class="px-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-30" :disabled="i === form.appearance.sidebarItems.length - 1" :aria-label="$t('Move {name} down', { name: $t(sidebarDefaults[item.key].label) })" @click="move(i, 1)">▼</button>
                </div>
                <svg class="h-5 w-5 shrink-0 text-stone-500" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="sidebarDefaults[item.key].icon" />
                </svg>
                <input
                  v-model="item.label"
                  :placeholder="$t(sidebarDefaults[item.key].label)"
                  maxlength="40"
                  class="input min-w-0 flex-1 py-1.5"
                  :aria-label="$t('Label for {name}', { name: $t(sidebarDefaults[item.key].label) })"
                />
                <label class="flex items-center gap-2 text-sm" :class="{ 'opacity-50': item.key === 'settings' }">
                  <input v-model="item.visible" type="checkbox" class="h-4 w-4 accent-primary" :disabled="item.key === 'settings'" />
                  {{ $t('Show') }}
                </label>
              </li>
            </ul>
          </section>
        </div>

        <aside class="xl:sticky xl:top-6 xl:self-start">
          <p class="mb-2 text-sm font-medium text-stone-600">{{ $t('Preview') }}</p>
          <!-- A miniature admin page: the menu where it will sit, the page in the chosen color mode. -->
          <div
            v-if="previewSidebar"
            :class="[
              colorModeClass(form.appearance.colorMode),
              { top: 'flex-col', left: 'flex-row', right: 'flex-row-reverse' }[form.appearance.sidebarPosition],
            ]"
            class="flex h-96 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 shadow-sm"
            aria-hidden="true"
          >
            <div
              :class="[
                previewSidebar.aside,
                previewSidebar.rule,
                form.appearance.sidebarPosition === 'top'
                  ? 'flex gap-1 overflow-hidden border-b p-1.5'
                  : ['shrink-0 space-y-0.5 overflow-hidden p-1.5', form.appearance.sidebarPosition === 'right' ? 'border-l' : 'border-r', form.appearance.sidebarCompact ? 'w-11' : 'w-36'],
              ]"
              class="theme-light"
            >
              <div
                v-for="(item, i) in form.appearance.sidebarItems.filter((x) => x.visible)"
                :key="item.key"
                :class="[i === 0 ? previewSidebar.active : '', form.appearance.sidebarCompact ? 'justify-center' : '']"
                class="flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-xs"
              >
                <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="sidebarDefaults[item.key].icon" />
                </svg>
                <span v-if="!form.appearance.sidebarCompact" class="truncate whitespace-nowrap">{{ item.label || $t(sidebarDefaults[item.key].label) }}</span>
              </div>
            </div>
            <div class="min-w-0 flex-1 space-y-2 p-3">
              <div class="h-3 w-1/2 rounded bg-stone-300" />
              <div class="grid grid-cols-2 gap-2">
                <div v-for="i in 4" :key="i" class="h-10 rounded-md border border-stone-200 bg-surface" />
              </div>
              <div class="h-24 rounded-md border border-stone-200 bg-surface" />
            </div>
          </div>
        </aside>
      </div>
    </fieldset>
  </template>
</template>
