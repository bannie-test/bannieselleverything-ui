// localStorage can be unavailable (private mode, blocked site data). The app must keep
// working without it, so every access is guarded and failures fall back to memory.
const memory = new Map<string, string>()

export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key) ?? memory.get(key) ?? null
    } catch {
      return memory.get(key) ?? null
    }
  },
  set(key: string, value: string | null) {
    if (value === null) {
      memory.delete(key)
      try {
        localStorage.removeItem(key)
      } catch {
        /* memory only */
      }
      return
    }
    memory.set(key, value)
    try {
      localStorage.setItem(key, value)
    } catch {
      /* memory only */
    }
  },
}
