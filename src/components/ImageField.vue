<script setup lang="ts">
import { useUpload } from '@/composables/useUpload'

/** A single image: paste a URL or upload a file. */
defineProps<{ id: string; label: string; hint?: string; error?: string }>()
const model = defineModel<string | null>({ required: true })
const { upload, uploading, error: uploadError } = useUpload()

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const [url] = await upload(input.files)
  if (url) model.value = url
  input.value = ''
}
</script>

<template>
  <div>
    <label :for="id" class="label">{{ label }}</label>
    <div class="flex items-start gap-3">
      <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
        <img v-if="model" :src="model" alt="" class="h-full w-full object-cover" />
        <svg v-else class="h-6 w-6 text-stone-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 5h16v14H4V5Zm0 11 4.5-4.5a2 2 0 0 1 3 0L16 16m-2-2 1.5-1.5a2 2 0 0 1 3 0L20 14M15 9h.01" />
        </svg>
      </div>
      <div class="min-w-0 flex-1 space-y-2">
        <input
          :id="id"
          :value="model ?? ''"
          :class="{ 'input-error': error }"
          class="input font-mono text-xs"
          placeholder="https://… or upload"
          @input="model = ($event.target as HTMLInputElement).value.trim() || null"
        />
        <div class="flex items-center gap-2">
          <label class="btn btn-secondary btn-sm cursor-pointer" :class="{ 'pointer-events-none opacity-50': uploading }">
            {{ uploading ? 'Uploading…' : 'Upload image' }}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="sr-only" @change="onFile" />
          </label>
          <button v-if="model" type="button" class="text-xs text-stone-500 hover:text-red-600" @click="model = null">Remove</button>
        </div>
      </div>
    </div>
    <p v-if="error || uploadError" class="field-error">{{ error || uploadError }}</p>
    <p v-else-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>
