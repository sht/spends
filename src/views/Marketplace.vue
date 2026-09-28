<script setup>
import { computed, inject, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { allPages, fileUrl, request } from '../api'
import { activePurchases, errorMessage, money, price } from '../utils'

const settings = inject('settings')
const route = useRoute()
const router = useRouter()
const pageSize = 20
const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isSafeInteger(value) && value > 0 ? value : 1
})
const items = ref([])
const summaryItems = ref([])
const total = ref(0)
const failedPhotos = ref(new Set())
const loading = ref(true)
const error = ref('')
const pages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const totalSpending = computed(() => activePurchases(summaryItems.value)
  .filter(item => !item.currency_code || item.currency_code.toUpperCase() === settings.currency_code.toUpperCase())
  .reduce((sum, item) => sum + Number(item.price || 0), 0))
let loadVersion = 0

function goToPage(number, replace = false) {
  const location = { path: '/marketplace', query: number === 1 ? {} : { page: String(number) } }
  return replace ? router.replace(location) : router.push(location)
}

async function load() {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const [result, all] = await Promise.all([
      request(`/purchases/?skip=${(page.value - 1) * pageSize}&limit=${pageSize}&sort_by=purchaseDate&sort_direction=desc`),
      allPages('/purchases/'),
    ])
    if (version !== loadVersion) return
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize))
    if (page.value > lastPage) { await goToPage(lastPage, true); return }
    items.value = result.items || []
    total.value = result.total || 0
    summaryItems.value = all
    failedPhotos.value = new Set()
  } catch (e) {
    if (version === loadVersion) error.value = errorMessage(e)
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

function markPhotoFailed(id) {
  failedPhotos.value = new Set([...failedPhotos.value, id])
}

watch(page, load, { immediate: true })
</script>

<template>
  <div class="page">
    <div class="page-head"><div><div class="eyebrow">BROWSE BY PHOTO</div><h1>Marketplace</h1><p class="subtle">A visual look at your purchases.</p></div></div>
    <div v-if="loading" class="panel state">Loading marketplace…</div>
    <div v-else-if="error" class="panel state error" role="alert">{{ error }} <button class="text-button" @click="load">Try again</button></div>
    <template v-else>
      <div class="panel marketplace-summary"><div><span class="metric-label">TOTAL ITEMS</span><strong>{{ total }}</strong></div><div><span class="metric-label">TOTAL SPENDING</span><strong>{{ money(totalSpending, settings.currency_code) }}</strong></div></div>
      <div v-if="!total" class="panel state">No purchases yet. <RouterLink to="/purchases/new">Add your first purchase →</RouterLink></div>
      <template v-else>
        <div class="marketplace-grid">
          <RouterLink v-for="item in items" :key="item.id" :to="`/purchases/${item.id}`" class="marketplace-card">
            <div class="marketplace-media"><img v-if="item.photo_id && !failedPhotos.has(item.id)" :src="fileUrl(item.photo_id)" :alt="item.product_name" loading="lazy" @error="markPhotoFailed(item.id)" /><div v-else class="marketplace-placeholder" aria-hidden="true">▦</div><span v-if="item.photo_count > 1" class="marketplace-photo-count">{{ item.photo_count }} photos</span></div>
            <div class="marketplace-card-body"><strong>{{ item.product_name }}</strong><span>{{ item.brand?.name || 'No brand' }}</span><b>{{ price(item, settings) }}</b></div>
          </RouterLink>
        </div>
        <nav v-if="pages > 1" class="pagination" aria-label="Marketplace pages"><button type="button" class="button quiet" :disabled="page === 1" @click="goToPage(page - 1)">← Previous</button><span>Page {{ page }} of {{ pages }}</span><button type="button" class="button quiet" :disabled="page === pages" @click="goToPage(page + 1)">Next →</button></nav>
      </template>
    </template>
  </div>
</template>
