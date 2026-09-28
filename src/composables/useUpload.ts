import { ref } from 'vue'
import { errorMessage, http } from '@/api/client'
import { t } from '@/i18n'

const MAX_BYTES = 5 * 1024 * 1024

/** Uploads images to /admin/media and returns their URLs. Tracks progress and the last error. */
export function useUpload() {
  const uploading = ref(false)
  const error = ref<string | null>(null)

  async function upload(files: FileList | File[] | null | undefined): Promise<string[]> {
    const list = Array.from(files ?? [])
    if (!list.length) return []
    error.value = null

    const tooBig = list.find((f) => f.size > MAX_BYTES)
    if (tooBig) {
      error.value = t('“{name}” is larger than 5 MB.', { name: tooBig.name })
      return []
    }

    uploading.value = true
    const urls: string[] = []
    try {
      for (const file of list) {
        const body = new FormData()
        body.append('file', file)
        urls.push((await http.post<{ url: string }>('/admin/media', body)).data.url)
      }
    } catch (e) {
      error.value = errorMessage(e, t('Upload failed. Please try again.'))
    } finally {
      uploading.value = false
    }
    return urls
  }

  return { upload, uploading, error }
}
