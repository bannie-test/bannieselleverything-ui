<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { errorMessage, fieldErrors, http } from '@/api/client'
import type { CornerStyle, FontFamily, SaveShopSettings, ShopSettings, SidebarStyle } from '@/api/types'
import ColorField from '@/components/ColorField.vue'
import ImageField from '@/components/ImageField.vue'
import { useAdminStore } from '@/stores/admin'
import { useTenantStore } from '@/stores/tenant'
import { money } from '@/utils/format'
import { sidebarDefaults } from '@/utils/sidebar'
import { cornerStyles, fonts, loadFont, themeVars } from '@/utils/theme'

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
  { key: 'theme', label: 'Storefront theme' },
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

onBeforeRouteLeave(() => !dirty.value || confirm('You have unsaved changes. Leave without saving?'))

// Fonts are loaded as they're picked so the preview shows them.
watch(() => form.value?.appearance.fontFamily, (f) => f && loadFont(f))

const previewStyle = computed(() => {
  const f = form.value
  if (!f) return {}
  return themeVars({ primaryColor: f.primaryColor, ...f.appearance })
})

const fontOptions = Object.entries(fonts) as [FontFamily, (typeof fonts)[FontFamily]][]
const cornerOptions = Object.entries(cornerStyles) as [CornerStyle, (typeof cornerStyles)[CornerStyle]][]
const sidebarStyles: { key: SidebarStyle; label: string; swatch: string }[] = [
  { key: 'dark', label: 'Dark', swatch: 'bg-stone-900' },
  { key: 'light', label: 'Light', swatch: 'bg-white border border-stone-300' },
  { key: 'brand', label: 'Brand color', swatch: 'bg-primary' },
]

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
    error.value = Object.keys(errors.value).length ? 'Please fix the highlighted fields.' : errorMessage(e)
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
      <h1 class="text-2xl font-semibold">Settings</h1>
      <p v-if="loaded" class="text-sm text-stone-500">{{ loaded.slug }} · prices in {{ loaded.currency }}</p>
    </div>
    <div v-if="form && admin.isOwner" class="flex items-center gap-2">
      <span v-if="dirty" class="text-sm text-amber-700">Unsaved changes</span>
      <button v-if="dirty" class="btn btn-secondary" :disabled="saving" @click="reset">Discard</button>
      <button class="btn btn-primary" :disabled="saving || !dirty" @click="save">{{ saving ? 'Saving…' : 'Save settings' }}</button>
    </div>
  </div>

  <p v-if="!admin.isOwner && form" class="alert-warning mt-4">Only the shop owner can change settings. You're viewing them read-only.</p>
  <p v-if="error" class="alert-error mt-4">{{ error }}</p>
  <p v-if="saved && !dirty" class="alert-success mt-4">Settings saved. The storefront now uses them.</p>

  <div v-if="!form && !error" class="mt-6 h-96 animate-pulse rounded-xl bg-stone-200" />

  <template v-if="form">
    <div class="mt-6 inline-flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1" role="tablist">
      <button v-for="t in tabs" :key="t.key" role="tab" :aria-selected="tab === t.key" :class="tab === t.key ? 'tab-active' : ''" class="tab" @click="tab = t.key">
        {{ t.label }}
      </button>
    </div>

    <fieldset :disabled="!admin.isOwner" class="mt-6">
      <!-- General -->
      <div v-if="tab === 'general'" class="grid max-w-3xl gap-6">
        <section class="card space-y-4 p-5">
          <h2 class="font-semibold">Shop profile</h2>
          <div>
            <label for="name" class="label">Shop name</label>
            <input id="name" v-model="form.name" :class="{ 'input-error': errors.name }" class="input" />
            <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
          </div>
          <ImageField id="logo" v-model="form.logoUrl" label="Logo" hint="Square images look best. Shown next to the shop name." :error="errors.logoUrl" />
        </section>
        <section class="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 class="font-semibold sm:col-span-2">Contact & shipping</h2>
          <div>
            <label for="email" class="label">Contact email</label>
            <input id="email" v-model="form.contactEmail" type="email" :class="{ 'input-error': errors.contactEmail }" class="input" />
            <p v-if="errors.contactEmail" class="field-error">{{ errors.contactEmail }}</p>
          </div>
          <div>
            <label for="phone" class="label">Contact phone</label>
            <input id="phone" v-model="form.contactPhone" class="input" />
          </div>
          <div class="sm:col-span-2">
            <label for="address" class="label">Address</label>
            <input id="address" v-model="form.address" class="input" />
            <p class="hint">Shown in the storefront footer and on printed receipts.</p>
          </div>
          <div>
            <label for="shipping" class="label">Flat shipping fee (₫)</label>
            <input id="shipping" v-model.number="form.flatShippingMinor" type="number" min="0" step="1000" :class="{ 'input-error': errors.flatShippingMinor }" class="input" />
            <p class="hint">{{ form.flatShippingMinor ? `${money(form.flatShippingMinor)} per order` : 'Free shipping on every order' }}</p>
          </div>
        </section>
        <section class="card space-y-4 p-5">
          <h2 class="font-semibold">Payment</h2>
          <p class="text-sm">Cash on delivery is always available.</p>
          <label class="flex items-center gap-2 text-sm font-medium">
            <input v-model="form.bankTransferEnabled" type="checkbox" class="h-4 w-4 accent-primary" />
            Accept bank transfers
          </label>
          <div v-if="form.bankTransferEnabled" class="grid gap-4 rounded-lg bg-stone-50 p-4 sm:grid-cols-2">
            <div>
              <label for="bankName" class="label">Bank</label>
              <input id="bankName" v-model="form.bankName" placeholder="Vietcombank" :class="{ 'input-error': errors.bankName }" class="input" />
              <p v-if="errors.bankName" class="field-error">{{ errors.bankName }}</p>
            </div>
            <div>
              <label for="bankAccountNumber" class="label">Account number</label>
              <input id="bankAccountNumber" v-model="form.bankAccountNumber" :class="{ 'input-error': errors.bankAccountNumber }" class="input font-mono" />
              <p v-if="errors.bankAccountNumber" class="field-error">{{ errors.bankAccountNumber }}</p>
            </div>
            <div class="sm:col-span-2">
              <label for="bankAccountName" class="label">Account holder name</label>
              <input id="bankAccountName" v-model="form.bankAccountName" :class="{ 'input-error': errors.bankAccountName }" class="input" />
              <p v-if="errors.bankAccountName" class="field-error">{{ errors.bankAccountName }}</p>
            </div>
            <p class="text-xs text-stone-500 sm:col-span-2">
              Customers see these details after ordering and use the order number as the transfer note. Confirm each payment from the order page.
            </p>
          </div>
        </section>
      </div>

      <!-- Theme -->
      <div v-else-if="tab === 'theme'" class="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div class="space-y-6">
          <section class="card grid gap-4 p-5 sm:grid-cols-2">
            <h2 class="font-semibold sm:col-span-2">Colors</h2>
            <ColorField id="primary" v-model="form.primaryColor" label="Brand color" hint="Buttons, links and the hero banner." :error="errors.primaryColor" />
            <ColorField id="accent" v-model="form.appearance.accentColor" label="Accent color" hint="Sale badges and highlights." :error="errors['appearance.accentColor']" />
          </section>

          <section class="card space-y-4 p-5">
            <h2 class="font-semibold">Typography & shape</h2>
            <div>
              <label for="font" class="label">Font</label>
              <select id="font" v-model="form.appearance.fontFamily" class="input">
                <option v-for="[key, f] in fontOptions" :key="key" :value="key">{{ f.label }}</option>
              </select>
            </div>
            <div>
              <p class="label">Corners</p>
              <div class="grid grid-cols-3 gap-2">
                <label
                  v-for="[key, c] in cornerOptions"
                  :key="key"
                  :class="form.appearance.cornerStyle === key ? 'border-primary ring-2 ring-primary/20' : 'border-stone-200 hover:border-stone-300'"
                  class="flex cursor-pointer flex-col items-center gap-2 border bg-white p-3 text-sm"
                  :style="{ borderRadius: c.radii[2] }"
                >
                  <input v-model="form.appearance.cornerStyle" type="radio" :value="key" class="sr-only" />
                  <span class="h-6 w-14 bg-stone-800" :style="{ borderRadius: c.radii[1] }" />
                  {{ c.label }}
                </label>
              </div>
            </div>
          </section>

          <section class="card space-y-4 p-5">
            <h2 class="font-semibold">Home page & announcement</h2>
            <div>
              <label for="announcement" class="label">Announcement bar</label>
              <input id="announcement" v-model="form.appearance.announcementText" maxlength="200" placeholder="e.g. Free shipping on orders over 500.000 ₫" class="input" />
              <p class="hint">A thin bar above the header on every page. Leave empty to hide it.</p>
            </div>
            <div>
              <label for="heroTitle" class="label">Hero title</label>
              <input id="heroTitle" v-model="form.appearance.heroTitle" maxlength="120" :placeholder="form.name" class="input" />
            </div>
            <div>
              <label for="heroSubtitle" class="label">Hero subtitle</label>
              <textarea id="heroSubtitle" v-model="form.appearance.heroSubtitle" maxlength="300" rows="2" class="input" />
            </div>
            <ImageField
              id="heroImage"
              v-model="form.appearance.heroImageUrl"
              label="Hero image"
              hint="Optional. Wide images (about 1600 × 600) work best; text sits on the left."
              :error="errors['appearance.heroImageUrl']"
            />
          </section>
        </div>

        <!-- Live preview: the same CSS variables the storefront uses, scoped to this box. -->
        <aside class="xl:sticky xl:top-6 xl:self-start">
          <p class="mb-2 text-sm font-medium text-stone-600">Preview</p>
          <div :style="previewStyle" class="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 font-sans text-stone-900 shadow-sm">
            <div v-if="form.appearance.announcementText" class="bg-accent px-3 py-1.5 text-center text-xs font-medium text-on-accent">
              {{ form.appearance.announcementText }}
            </div>
            <div class="flex items-center gap-2 border-b border-stone-200 bg-white px-3 py-2.5">
              <img v-if="form.logoUrl" :src="form.logoUrl" alt="" class="h-6 w-6 rounded" />
              <span class="font-bold text-primary">{{ form.name || 'Your shop' }}</span>
              <span class="ml-auto h-6 w-24 rounded-lg border border-stone-200 bg-stone-50" />
            </div>
            <div class="p-3">
              <div
                class="relative overflow-hidden rounded-2xl bg-primary bg-cover bg-center p-5 text-on-primary"
                :style="form.appearance.heroImageUrl ? { backgroundImage: `linear-gradient(90deg, rgb(0 0 0 / .55), rgb(0 0 0 / .1)), url(${form.appearance.heroImageUrl})`, color: '#fff' } : {}"
              >
                <p class="text-lg leading-tight font-bold">{{ form.appearance.heroTitle || form.name }}</p>
                <p v-if="form.appearance.heroSubtitle" class="mt-1 text-xs opacity-90">{{ form.appearance.heroSubtitle }}</p>
                <span class="btn btn-sm mt-3 bg-white text-stone-900">Shop now</span>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <div v-for="i in 2" :key="i" class="overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <div class="relative aspect-[4/3] bg-stone-200">
                    <span v-if="i === 1" class="pill absolute top-1.5 left-1.5 bg-accent text-on-accent">−15%</span>
                  </div>
                  <div class="p-2">
                    <p class="text-xs font-medium">Sample product</p>
                    <p class="text-sm font-semibold" :class="i === 1 ? 'text-red-600' : ''">{{ money(i === 1 ? 170000 : 290000) }}</p>
                  </div>
                </div>
              </div>
              <div class="mt-3 flex gap-2">
                <span class="btn btn-primary btn-sm">Add to cart</span>
                <span class="btn btn-secondary btn-sm">Details</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- Sidebar -->
      <div v-else class="grid gap-6 xl:grid-cols-[1fr_18rem]">
        <div class="space-y-6">
          <section class="card space-y-4 p-5">
            <h2 class="font-semibold">Style</h2>
            <div class="grid grid-cols-3 gap-2">
              <label
                v-for="s in sidebarStyles"
                :key="s.key"
                :class="form.appearance.sidebarStyle === s.key ? 'border-primary ring-2 ring-primary/20' : 'border-stone-200 hover:border-stone-300'"
                class="flex cursor-pointer items-center gap-2 rounded-lg border bg-white p-3 text-sm"
              >
                <input v-model="form.appearance.sidebarStyle" type="radio" :value="s.key" class="sr-only" />
                <span :class="s.swatch" class="h-8 w-5 shrink-0 rounded" />
                {{ s.label }}
              </label>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.appearance.sidebarCompact" type="checkbox" class="h-4 w-4 accent-primary" />
              Compact — icons only on wide screens
            </label>
          </section>

          <section class="card p-5">
            <h2 class="font-semibold">Menu items</h2>
            <p class="text-sm text-stone-500">Reorder, rename or hide entries. Settings always stays visible so you can come back here.</p>
            <ul class="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-200">
              <li v-for="(item, i) in form.appearance.sidebarItems" :key="item.key" class="flex flex-wrap items-center gap-3 px-3 py-2.5" :class="{ 'bg-stone-50': !item.visible }">
                <div class="flex flex-col">
                  <button type="button" class="px-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-30" :disabled="i === 0" :aria-label="`Move ${item.key} up`" @click="move(i, -1)">▲</button>
                  <button type="button" class="px-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-30" :disabled="i === form.appearance.sidebarItems.length - 1" :aria-label="`Move ${item.key} down`" @click="move(i, 1)">▼</button>
                </div>
                <svg class="h-5 w-5 shrink-0 text-stone-500" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="sidebarDefaults[item.key].icon" />
                </svg>
                <input
                  v-model="item.label"
                  :placeholder="sidebarDefaults[item.key].label"
                  maxlength="40"
                  class="input min-w-0 flex-1 py-1.5"
                  :aria-label="`Label for ${sidebarDefaults[item.key].label}`"
                />
                <label class="flex items-center gap-2 text-sm" :class="{ 'opacity-50': item.key === 'settings' }">
                  <input v-model="item.visible" type="checkbox" class="h-4 w-4 accent-primary" :disabled="item.key === 'settings'" />
                  Show
                </label>
              </li>
            </ul>
          </section>
        </div>

        <aside class="xl:sticky xl:top-6 xl:self-start">
          <p class="mb-2 text-sm font-medium text-stone-600">Preview</p>
          <div
            :class="{
              'bg-stone-900 text-stone-300': form.appearance.sidebarStyle === 'dark',
              'border border-stone-200 bg-white text-stone-700': form.appearance.sidebarStyle === 'light',
              'bg-primary text-on-primary': form.appearance.sidebarStyle === 'brand',
              'w-16': form.appearance.sidebarCompact,
            }"
            class="space-y-1 rounded-xl p-2 shadow-sm"
          >
            <template v-for="(item, i) in form.appearance.sidebarItems.filter((x) => x.visible)" :key="item.key">
              <div
                :class="[
                  i === 0 ? (form.appearance.sidebarStyle === 'light' ? 'bg-primary/10 text-primary' : form.appearance.sidebarStyle === 'brand' ? 'bg-black/20' : 'bg-stone-800 text-white') : '',
                  form.appearance.sidebarCompact ? 'justify-center' : '',
                ]"
                class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="sidebarDefaults[item.key].icon" />
                </svg>
                <span v-if="!form.appearance.sidebarCompact" class="truncate">{{ item.label || sidebarDefaults[item.key].label }}</span>
              </div>
            </template>
          </div>
        </aside>
      </div>
    </fieldset>
  </template>
</template>
