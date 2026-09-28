<script setup lang="ts">
import { computed } from 'vue'

/**
 * One piece of shop content in both languages: Vietnamese (the default) and English side by side.
 * The English is required whenever the Vietnamese is filled in; the API enforces that too.
 */
const props = withDefaults(
  defineProps<{
    id: string
    label: string
    multiline?: boolean
    rows?: number
    maxlength?: number
    placeholder?: string
    placeholderEn?: string
    required?: boolean
    error?: string
    errorEn?: string
    hint?: string
    /** English under the Vietnamese instead of beside it, for narrow forms. */
    stacked?: boolean
  }>(),
  { multiline: false, rows: 3, maxlength: undefined, placeholder: undefined, placeholderEn: undefined, required: false, error: undefined, errorEn: undefined, hint: undefined, stacked: false },
)
const vi = defineModel<string | null>('vi', { required: true })
const en = defineModel<string | null>('en', { required: true })

const needsEnglish = computed(() => !!vi.value?.trim() && !en.value?.trim())

// Optional fields go back to null when cleared, like the rest of the forms.
const read = (event: Event) => {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value
  return value === '' && !props.required ? null : value
}
const setVi = (event: Event) => (vi.value = read(event))
const setEn = (event: Event) => (en.value = read(event))
</script>

<template>
  <div>
    <label :for="id" class="label">{{ label }}</label>
    <div :class="{ 'sm:grid-cols-2': !stacked }" class="grid gap-2">
      <div>
        <span class="mb-1 flex items-center gap-1.5 text-xs text-stone-500">
          <span class="rounded bg-stone-100 px-1 font-semibold text-stone-700">VI</span>Tiếng Việt
        </span>
        <textarea v-if="multiline" :id="id" :value="vi ?? ''" :rows="rows" :maxlength="maxlength" :placeholder="placeholder" :class="{ 'input-error': error }" class="input" @input="setVi" />
        <input v-else :id="id" :value="vi ?? ''" :maxlength="maxlength" :placeholder="placeholder" :required="required" :class="{ 'input-error': error }" class="input" @input="setVi" />
        <p v-if="error" class="field-error">{{ error }}</p>
      </div>
      <div>
        <span class="mb-1 flex items-center gap-1.5 text-xs text-stone-500">
          <span class="rounded bg-stone-100 px-1 font-semibold text-stone-700">EN</span>English
        </span>
        <textarea
          v-if="multiline"
          :id="`${id}-en`"
          lang="en"
          :value="en ?? ''"
          :rows="rows"
          :maxlength="maxlength"
          :placeholder="placeholderEn"
          :aria-label="`${label} (English)`"
          :class="{ 'input-error': errorEn, 'border-amber-400': needsEnglish && !errorEn }"
          class="input"
          @input="setEn"
        />
        <input
          v-else
          :id="`${id}-en`"
          lang="en"
          :value="en ?? ''"
          :maxlength="maxlength"
          :placeholder="placeholderEn"
          :aria-label="`${label} (English)`"
          :class="{ 'input-error': errorEn, 'border-amber-400': needsEnglish && !errorEn }"
          class="input"
          @input="setEn"
        />
        <p v-if="errorEn" class="field-error">{{ errorEn }}</p>
        <p v-else-if="needsEnglish" class="mt-1 text-xs text-amber-700">{{ $t('Enter the English version too.') }}</p>
      </div>
    </div>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>
