<script setup lang="ts">
defineProps<{ id: string; label: string; hint?: string; error?: string }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div>
    <label :for="id" class="label">{{ label }}</label>
    <div class="flex items-center gap-2">
      <input
        v-model="model"
        type="color"
        class="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-stone-300 bg-surface p-1"
        :aria-label="$t('{label} picker', { label })"
      />
      <input :id="id" v-model.trim="model" maxlength="7" :class="{ 'input-error': error }" class="input w-28 font-mono uppercase" />
    </div>
    <p v-if="error" class="field-error">{{ error }}</p>
    <p v-else-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>
