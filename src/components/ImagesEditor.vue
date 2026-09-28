<script setup lang="ts">
import { ref } from 'vue'
import { useUpload } from '@/composables/useUpload'

/** An ordered image collection. The first image is the product's main image. */
const props = withDefaults(defineProps<{ max?: number; error?: string }>(), { max: 20, error: undefined })
const images = defineModel<string[]>({ required: true })

const { upload, uploading, error: uploadError } = useUpload()
const urlInput = ref('')
const urlError = ref<string | null>(null)
const dragOver = ref(false)

function add(urls: string[]) {
  const next = [...images.value]
  for (const url of urls) if (!next.includes(url) && next.length < props.max) next.push(url)
  images.value = next
}

async function onFiles(files: FileList | null | undefined) {
  const room = props.max - images.value.length
  if (room <= 0) return
  add(await upload(Array.from(files ?? []).slice(0, room)))
}

function addUrl() {
  const url = urlInput.value.trim()
  urlError.value = null
  if (!url) return
  if (!/^https?:\/\/\S+$/i.test(url)) {
    urlError.value = 'Enter a full http(s) address.'
    return
  }
  add([url])
  urlInput.value = ''
}

function move(from: number, to: number) {
  if (to < 0 || to >= images.value.length) return
  const next = [...images.value]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  images.value = next
}

function remove(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}
</script>

<template>
  <div>
    <ul v-if="images.length" class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      <li v-for="(src, i) in images" :key="src" class="group relative">
        <div :class="i === 0 ? 'ring-2 ring-primary' : 'border border-stone-200'" class="aspect-square overflow-hidden rounded-lg bg-stone-100">
          <img :src="src" alt="" class="h-full w-full object-cover" loading="lazy" />
        </div>
        <span v-if="i === 0" class="pill absolute top-1.5 left-1.5 bg-primary text-on-primary">Main</span>
        <div class="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <div class="flex gap-1">
            <button type="button" class="rounded bg-white/90 px-1.5 text-xs shadow hover:bg-white disabled:opacity-40" :disabled="i === 0" :aria-label="`Move image ${i + 1} left`" @click="move(i, i - 1)">←</button>
            <button type="button" class="rounded bg-white/90 px-1.5 text-xs shadow hover:bg-white disabled:opacity-40" :disabled="i === images.length - 1" :aria-label="`Move image ${i + 1} right`" @click="move(i, i + 1)">→</button>
          </div>
          <div class="flex gap-1">
            <button v-if="i > 0" type="button" class="rounded bg-white/90 px-1.5 text-xs shadow hover:bg-white" title="Make main image" @click="move(i, 0)">★</button>
            <button type="button" class="rounded bg-white/90 px-1.5 text-xs text-red-600 shadow hover:bg-white" :aria-label="`Remove image ${i + 1}`" @click="remove(i)">✕</button>
          </div>
        </div>
      </li>
    </ul>

    <label
      v-if="images.length < max"
      :class="[dragOver ? 'border-primary bg-primary/5' : 'border-stone-300 hover:border-stone-400', { 'mt-3': images.length }, { 'pointer-events-none opacity-60': uploading }]"
      class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="dragOver = false; onFiles($event.dataTransfer?.files)"
    >
      <span class="font-medium text-stone-700">{{ uploading ? 'Uploading…' : 'Drop images here or click to upload' }}</span>
      <span class="text-xs text-stone-500">JPEG, PNG, WebP or GIF, up to 5 MB each · {{ images.length }}/{{ max }}</span>
      <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" class="sr-only" @change="onFiles(($event.target as HTMLInputElement).files); ($event.target as HTMLInputElement).value = ''" />
    </label>

    <div v-if="images.length < max" class="mt-3 flex gap-2">
      <input v-model="urlInput" type="url" placeholder="…or paste an image URL" class="input font-mono text-xs" aria-label="Image URL" @keydown.enter.prevent="addUrl" />
      <button type="button" class="btn btn-secondary shrink-0" @click="addUrl">Add</button>
    </div>
    <p v-if="error || uploadError || urlError" class="field-error">{{ error || uploadError || urlError }}</p>
    <p v-else class="hint">The main image appears in listings. Use ← → or ★ to reorder.</p>
  </div>
</template>
