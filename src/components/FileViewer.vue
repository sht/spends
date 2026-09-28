<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { fileUrl } from '../api'

const props = defineProps({
  files: { type: Array, required: true },
  initialIndex: { type: Number, default: 0 },
})
const emit = defineEmits(['close'])
const dialog = ref(null)
const index = ref(Math.max(0, Math.min(props.initialIndex, props.files.length - 1)))
const current = computed(() => props.files[index.value] || null)
const previewError = ref(false)
const previewLoading = ref(false)
const isImage = computed(() => {
  const mime = current.value?.mime_type?.toLowerCase() || ''
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(current.value?.filename || '')
})
const isPdf = computed(() => current.value?.mime_type?.toLowerCase() === 'application/pdf' || /\.pdf$/i.test(current.value?.filename || ''))
let previousFocus = null
let previousOverflow = ''

watch(current, () => {
  previewError.value = false
  previewLoading.value = isImage.value || isPdf.value
}, { immediate: true })

function move(step) {
  if (props.files.length < 2) return
  index.value = (index.value + step + props.files.length) % props.files.length
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

onMounted(async () => {
  previousFocus = document.activeElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  await nextTick()
  dialog.value?.focus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = previousOverflow
  previousFocus?.focus?.()
})
</script>

<template>
  <div class="file-viewer-backdrop" @click.self="emit('close')">
    <section ref="dialog" class="file-viewer" role="dialog" aria-modal="true" :aria-label="current ? `Viewing ${current.filename}` : 'File viewer'" tabindex="-1">
      <header class="file-viewer-header"><div><strong>{{ current?.filename || 'File viewer' }}</strong><span v-if="current">{{ index + 1 }} / {{ files.length }}</span></div><div class="file-viewer-actions"><a v-if="current" :href="fileUrl(current.id)" :download="current.filename" class="button quiet">Download</a><button type="button" class="button quiet" aria-label="Close file viewer" @click="emit('close')">Close ✕</button></div></header>
      <div class="file-viewer-stage">
        <p v-if="!current" class="file-viewer-message">No file to preview.</p>
        <template v-else-if="!previewError && isImage"><p v-if="previewLoading" class="file-viewer-loading" role="status">Loading image…</p><img :key="current.id" :src="fileUrl(current.id)" :alt="current.filename" @load="previewLoading = false" @error="previewError = true; previewLoading = false" /></template>
        <template v-else-if="!previewError && isPdf"><p v-if="previewLoading" class="file-viewer-loading" role="status">Loading PDF…</p><iframe :key="current.id" :src="fileUrl(current.id)" :title="`Preview of ${current.filename}`" @load="previewLoading = false" @error="previewError = true; previewLoading = false"></iframe></template>
        <div v-else class="file-viewer-message"><span aria-hidden="true">▤</span><strong>{{ current.filename }}</strong><p>{{ previewError ? 'Preview could not be loaded.' : 'No preview available for this file type.' }}</p><a :href="fileUrl(current.id)" :download="current.filename" class="button secondary">Download file</a></div>
      </div>
      <footer v-if="files.length > 1" class="file-viewer-footer"><button type="button" class="button quiet" @click="move(-1)">← Previous</button><span>{{ index + 1 }} / {{ files.length }}</span><button type="button" class="button quiet" @click="move(1)">Next →</button></footer>
    </section>
  </div>
</template>
