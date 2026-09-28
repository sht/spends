<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
import { allPages } from '../api'
import { dateLabel, daysUntil, errorMessage, photo, price, statusLabel } from '../utils'
import { useRoute, useRouter } from 'vue-router'

const settings = inject('settings')
const route = useRoute()
const router = useRouter()
const items = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const status = ref('all')
const warranty = ref('all')
const retailer = ref('all')
const brand = ref('all')
const tag = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const tax = ref('all')
const moreFilters = ref(false)
const sort = ref('newest')
const view = ref(localStorage.getItem('spends-view') || 'list')
const page = ref(1)
const pageSize = 20
watch(view, value => localStorage.setItem('spends-view', value))
watch([search, status, warranty, sort, retailer, brand, tag, dateFrom, dateTo, tax, () => route.query.due], () => { page.value = 1 })
async function load() {
  loading.value = true; error.value = ''
  try { items.value = await allPages('/purchases/') }
  catch (e) { error.value = errorMessage(e) }
  finally { loading.value = false }
}
onMounted(load)
const retailers = computed(() => [...new Map(items.value.filter(p => p.retailer).map(p => [p.retailer.id, p.retailer])).values()].sort((a, b) => a.name.localeCompare(b.name)))
const brands = computed(() => [...new Map(items.value.filter(p => p.brand).map(p => [p.brand.id, p.brand])).values()].sort((a, b) => a.name.localeCompare(b.name)))
const tags = computed(() => [...new Set(items.value.flatMap(p => (p.tags || '').split(',').map(t => t.trim()).filter(Boolean)))].sort())
function clearFilters() {
  search.value = ''; status.value = 'all'; warranty.value = 'all'; retailer.value = 'all'; brand.value = 'all'
  tag.value = 'all'; dateFrom.value = ''; dateTo.value = ''; tax.value = 'all'; router.replace('/purchases')
}
const results = computed(() => {
  const q = search.value.trim().toLocaleLowerCase()
  return items.value.filter(item => {
    if (status.value !== 'all' && item.item_status !== status.value) return false
    if (retailer.value !== 'all' && item.retailer_id !== retailer.value) return false
    if (brand.value !== 'all' && item.brand_id !== brand.value) return false
    if (tag.value !== 'all' && !(item.tags || '').split(',').some(t => t.trim() === tag.value)) return false
    if (dateFrom.value && item.purchase_date < dateFrom.value) return false
    if (dateTo.value && item.purchase_date > dateTo.value) return false
    if (tax.value !== 'all' && Boolean(item.tax_deductible) !== (tax.value === 'yes')) return false
    if (route.query.due === 'returns' && !(item.item_status === 'active' && item.return_deadline && daysUntil(item.return_deadline) >= 0 && daysUntil(item.return_deadline) <= 30)) return false
    if (route.query.due === 'warranties' && !(item.item_status === 'active' && item.warranty?.status === 'ACTIVE' && item.warranty.warranty_end !== '9999-12-31' && daysUntil(item.warranty.warranty_end) >= 0 && daysUntil(item.warranty.warranty_end) <= 30)) return false
    if (warranty.value !== 'all') {
      const coverage = item.warranty?.status || 'NONE'
      if (coverage !== warranty.value) return false
    }
    if (!q) return true
    return [item.product_name, item.model_number, item.serial_number, item.retailer_order_number, item.tags, item.notes, item.retailer?.name, item.brand?.name]
      .some(value => String(value || '').toLocaleLowerCase().includes(q))
  }).sort((a, b) => {
    if (sort.value === 'price-desc') return Number(b.price) - Number(a.price)
    if (sort.value === 'price-asc') return Number(a.price) - Number(b.price)
    if (sort.value === 'oldest') return a.purchase_date.localeCompare(b.purchase_date)
    if (sort.value === 'name') return a.product_name.localeCompare(b.product_name)
    return b.purchase_date.localeCompare(a.purchase_date)
  })
})
const visible = computed(() => results.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const pages = computed(() => Math.max(1, Math.ceil(results.value.length / pageSize)))
</script>

<template>
  <div class="page">
    <div class="page-head"><div><div class="eyebrow">YOUR COLLECTION</div><h1>Purchases <span class="heading-count">{{ items.length }}</span></h1><p class="subtle">Everything you bought, with its history and paperwork.</p></div><RouterLink to="/purchases/new" class="button primary desktop-add">+ Add purchase</RouterLink></div>
    <div class="filter-panel"><label class="search-box"><span aria-hidden="true">⌕</span><input v-model="search" type="search" placeholder="Search products, serials, retailers…" aria-label="Search purchases" /></label>
      <div class="filter-controls"><label><span class="sr-only">Item status</span><select v-model="status"><option value="all">All statuses</option><option v-for="value in ['active','sold','lost','donated','disposed']" :key="value" :value="value">{{ statusLabel(value) }}</option></select></label>
        <label><span class="sr-only">Warranty status</span><select v-model="warranty"><option value="all">All coverage</option><option value="ACTIVE">Covered</option><option value="EXPIRED">Expired</option><option value="VOIDED">Voided</option><option value="NONE">No warranty</option></select></label>
        <label><span class="sr-only">Sort purchases</span><select v-model="sort"><option value="newest">Newest purchase</option><option value="oldest">Oldest purchase</option><option value="price-desc">Price: high to low</option><option value="price-asc">Price: low to high</option><option value="name">Product name</option></select></label>
        <button type="button" class="button quiet small more-filter-button" :aria-expanded="moreFilters" @click="moreFilters = !moreFilters">{{ moreFilters ? 'Fewer filters' : 'More filters' }}</button>
        <div class="view-switch" aria-label="Display mode"><button type="button" aria-label="List view" :aria-pressed="view === 'list'" :class="{ active: view === 'list' }" @click="view = 'list'">☰</button><button type="button" aria-label="Photo grid view" :aria-pressed="view === 'grid'" :class="{ active: view === 'grid' }" @click="view = 'grid'">▦</button></div>
      </div>
      <div v-if="moreFilters" class="advanced-filters"><label>Retailer<select v-model="retailer"><option value="all">All retailers</option><option v-for="value in retailers" :key="value.id" :value="value.id">{{ value.name }}</option></select></label><label>Brand<select v-model="brand"><option value="all">All brands</option><option v-for="value in brands" :key="value.id" :value="value.id">{{ value.name }}</option></select></label><label>Tag<select v-model="tag"><option value="all">All tags</option><option v-for="value in tags" :key="value" :value="value">{{ value }}</option></select></label><label>From<input v-model="dateFrom" type="date" /></label><label>To<input v-model="dateTo" type="date" /></label><label>Tax deductible<select v-model="tax"><option value="all">Any</option><option value="yes">Yes</option><option value="no">No</option></select></label></div>
    </div>
    <div v-if="loading" class="panel state">Loading purchases…</div>
    <div v-else-if="error" class="panel state error" role="alert">{{ error }} <button class="text-button" @click="load">Try again</button></div>
    <template v-else>
      <div class="results-caption">{{ results.length }} {{ results.length === 1 ? 'purchase' : 'purchases' }}<span v-if="results.length"> · Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, results.length) }}</span><span v-if="route.query.due"> · {{ route.query.due === 'returns' ? 'Return deadlines' : 'Warranties ending' }} in 30 days</span><button v-if="search || status !== 'all' || warranty !== 'all' || retailer !== 'all' || brand !== 'all' || tag !== 'all' || dateFrom || dateTo || tax !== 'all' || route.query.due" class="text-button" @click="clearFilters">Clear filters</button></div>
      <div v-if="!results.length" class="panel state">{{ items.length ? 'No purchases match your filters.' : 'No purchases yet.' }} <RouterLink v-if="!items.length" to="/purchases/new">Add your first purchase →</RouterLink></div>
      <div v-else-if="view === 'list'" class="panel purchase-list"><RouterLink v-for="item in visible" :key="item.id" :to="`/purchases/${item.id}`" class="purchase-row"><img v-if="photo(item)" :src="photo(item)" alt="" class="item-photo" /><div v-else class="item-photo no-photo">▦</div><div class="purchase-name"><strong>{{ item.product_name }}</strong><span>{{ [item.brand?.name, item.retailer?.name].filter(Boolean).join(' · ') || 'No brand or retailer' }}</span></div><span class="purchase-date">{{ dateLabel(item.purchase_date, settings.date_format) }}</span><span class="status-chip" :class="item.item_status">{{ statusLabel(item.item_status) }}</span><strong class="purchase-price">{{ price(item, settings) }}</strong><span class="row-arrow">↗</span></RouterLink></div>
      <div v-else class="purchase-grid"><RouterLink v-for="item in visible" :key="item.id" :to="`/purchases/${item.id}`" class="grid-card"><img v-if="photo(item)" :src="photo(item)" alt="" class="grid-photo" /><div v-else class="grid-photo no-photo">▦</div><div class="grid-body"><span class="small-muted">{{ item.brand?.name || item.retailer?.name || 'Purchase' }}</span><strong>{{ item.product_name }}</strong><span class="grid-meta">{{ dateLabel(item.purchase_date, settings.date_format) }} <span>·</span> {{ statusLabel(item.item_status) }}</span><b>{{ price(item, settings) }}</b></div></RouterLink></div>
      <div v-if="pages > 1" class="pagination"><button class="button quiet" :disabled="page === 1" @click="page--">← Previous</button><span>Page {{ page }} of {{ pages }}</span><button class="button quiet" :disabled="page === pages" @click="page++">Next →</button></div>
    </template>
  </div>
</template>
