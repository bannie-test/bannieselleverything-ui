<script setup lang="ts">
const props = withDefaults(defineProps<{ max?: number; disabled?: boolean }>(), { max: 99, disabled: false })
const quantity = defineModel<number>({ required: true })

function set(value: number) {
  quantity.value = Math.min(Math.max(1, Math.floor(value) || 1), Math.max(1, props.max))
}
</script>

<template>
  <div class="inline-flex items-center rounded-lg border border-stone-300 bg-white">
    <button
      type="button"
      class="h-9 w-9 text-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40"
      :disabled="disabled || quantity <= 1"
      aria-label="Decrease quantity"
      @click="set(quantity - 1)"
    >
      −
    </button>
    <input
      :value="quantity"
      type="number"
      inputmode="numeric"
      min="1"
      :max="max"
      :disabled="disabled"
      aria-label="Quantity"
      class="h-9 w-12 border-x border-stone-300 text-center text-sm [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      @change="set(Number(($event.target as HTMLInputElement).value))"
    />
    <button
      type="button"
      class="h-9 w-9 text-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40"
      :disabled="disabled || quantity >= max"
      aria-label="Increase quantity"
      @click="set(quantity + 1)"
    >
      +
    </button>
  </div>
</template>
