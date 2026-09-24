import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '@/api/client'

const POLL_MS = 60_000

/** Unread badge for the header bell. Polls while the tab is visible and a customer is signed in. */
export const useNotificationsStore = defineStore('notifications', () => {
  const unread = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  async function refresh() {
    try {
      unread.value = (await http.get<{ count: number }>('/storefront/account/notifications/unread-count')).data.count
    } catch {
      /* the badge is best-effort */
    }
  }

  function start() {
    stop()
    refresh()
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
    unread.value = 0
  }

  return { unread, refresh, start, stop }
})
