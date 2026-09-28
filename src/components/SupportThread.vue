<script setup lang="ts">
import type { SupportMessage } from '@/api/types'
import { formatDateTime } from '@/utils/format'

/** <c>own</c> is the side the viewer is on; their messages are aligned right. */
defineProps<{ messages: SupportMessage[]; own: SupportMessage['authorType'] }>()
</script>

<template>
  <ol class="space-y-3">
    <li v-for="m in messages" :key="m.id" :class="m.authorType === own ? 'justify-end' : 'justify-start'" class="flex">
      <div
        :class="m.authorType === own ? 'bg-primary/10' : 'border border-stone-200 bg-surface'"
        class="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
      >
        <p class="text-xs text-stone-500">
          <span class="font-medium text-stone-700">{{ m.authorName }}</span>
          <span v-if="m.authorType === 'Staff'"> · {{ $t('Shop') }}</span>
          · {{ formatDateTime(m.createdAt) }}
        </p>
        <p class="mt-1 whitespace-pre-line">{{ m.body }}</p>
      </div>
    </li>
  </ol>
</template>
