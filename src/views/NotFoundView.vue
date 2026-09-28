<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
    <p class="text-5xl font-bold text-stone-300">404</p>
    <h1 class="text-xl font-semibold">{{ $t('Page not found') }}</h1>
    <RouterLink :to="{ name: 'home' }" class="btn btn-primary mt-2">{{ $t('Go to the shop') }}</RouterLink>
  </div>
</template>
