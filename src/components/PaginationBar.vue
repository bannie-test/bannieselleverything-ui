<script setup lang="ts">
defineProps<{ page: number; totalPages: number }>()
const emit = defineEmits<{ change: [page: number] }>()
</script>

<template>
  <nav v-if="totalPages > 1" class="flex items-center justify-center gap-3" aria-label="Pagination">
    <button class="btn btn-secondary" :disabled="page <= 1" @click="emit('change', page - 1)">Previous</button>
    <span class="text-sm text-stone-600">Page {{ page }} of {{ totalPages }}</span>
    <button class="btn btn-secondary" :disabled="page >= totalPages" @click="emit('change', page + 1)">Next</button>
  </nav>
</template>
