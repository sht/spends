<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { allPages } from '../api'
import { activePurchases, currencyMismatch, errorMessage, money, spendingInCurrency } from '../utils'

const settings = inject('settings')
const purchases = ref([])
const loading = ref(true)
const error = ref('')
async function load() {
  loading.value = true; error.value = ''
  try {
    purchases.value = await allPages('/purchases/')
  } catch (e) { error.value = errorMessage(e) }
  finally { loading.value = false }
}
onMounted(load)
const active = computed(() => activePurchases(purchases.value))
const selected = computed(() => active.value.filter(p => !currencyMismatch(p, settings.currency_code)))
const needsReview = computed(() => active.value.filter(p => currencyMismatch(p, settings.currency_code)))
const monthly = computed(() => {
  const months = new Map()
  for (const item of selected.value) {
    const key = item.purchase_date?.slice(0, 7)
    if (key) months.set(key, (months.get(key) || 0) + Number(item.price || 0))
  }
  const end = new Date()
  const result = []
  for (let i = 11; i >= 0; i--) {
    const date = new Date(end.getFullYear(), end.getMonth() - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    result.push({ key, label: date.toLocaleString(undefined, { month: 'short', year: '2-digit' }), value: months.get(key) || 0 })
  }
  return result
})
const monthlyMax = computed(() => Math.max(1, ...monthly.value.map(row => row.value)))
function grouped(key) {
  const values = new Map()
  for (const item of selected.value) {
    const name = item[key]?.name || `No ${key}`
    values.set(name, (values.get(name) || 0) + Number(item.price || 0))
  }
  return [...values.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
}
const retailers = computed(() => grouped('retailer'))
const brands = computed(() => grouped('brand'))
const expensive = computed(() => [...selected.value].sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 5))
function width(value, list) { return `${Math.max(0, Math.round(value / Math.max(1, ...list.map(row => row[1])) * 100))}%` }
</script>

<template>
  <div class="page"><div class="page-head"><div><div class="eyebrow">THE BIG PICTURE</div><h1>Insights</h1><p class="subtle">Where your recorded spending went.</p></div></div>
    <div v-if="loading" class="panel state">Loading insights…</div>
    <div v-else-if="error" class="panel state error" role="alert">{{ error }} <button class="text-button" @click="load">Try again</button></div>
    <template v-else-if="active.length">
      <div class="insight-intro"><div><span class="metric-label">Recorded Spendings</span><strong>{{ money(spendingInCurrency(active, settings.currency_code), settings.currency_code) }}</strong></div></div>
      <p v-if="needsReview.length" class="notice" role="status">{{ needsReview.length }} active {{ needsReview.length === 1 ? 'purchase is' : 'purchases are' }} excluded until {{ settings.currency_code }} amounts are entered. <RouterLink v-for="(item, index) in needsReview" :key="item.id" :to="`/purchases/${item.id}/edit`">{{ item.product_name }}{{ index < needsReview.length - 1 ? ', ' : '' }}</RouterLink></p>
      <section class="panel insight-section"><div class="panel-head"><div><span class="section-kicker">LAST 12 MONTHS</span><h2>When did I spend?</h2></div></div><p class="small-muted">Months without purchases are shown as zero.</p><div class="month-chart"><div v-for="row in monthly" :key="row.key" class="month-column"><span class="bar-amount">{{ row.value ? money(row.value, settings.currency_code) : '' }}</span><div class="bar-track"><div class="month-bar" :style="{ height: row.value ? `${Math.max(3, row.value / monthlyMax * 100)}%` : '0%' }"></div></div><span class="bar-label">{{ row.label }}</span></div></div></section>
      <div class="insight-grid"><section class="panel insight-section"><div class="panel-head"><div><span class="section-kicker">BY RETAILER</span><h2>Where did I spend?</h2></div></div><p v-if="!retailers.length" class="empty-inline">No retailers recorded.</p><div v-for="[name, amount] in retailers" :key="name" class="rank-row"><div><span>{{ name }}</span><strong>{{ money(amount, settings.currency_code) }}</strong></div><div class="rank-track"><div :style="{ width: width(amount, retailers) }"></div></div></div></section>
        <section class="panel insight-section"><div class="panel-head"><div><span class="section-kicker">BY BRAND</span><h2>What did I buy?</h2></div></div><p v-if="!brands.length" class="empty-inline">No brands recorded.</p><div v-for="[name, amount] in brands" :key="name" class="rank-row"><div><span>{{ name }}</span><strong>{{ money(amount, settings.currency_code) }}</strong></div><div class="rank-track"><div :style="{ width: width(amount, brands) }"></div></div></div></section></div>
      <section class="panel insight-section"><div class="panel-head"><div><span class="section-kicker">BIGGEST PURCHASES</span><h2>What cost the most?</h2></div></div><div v-for="item in expensive" :key="item.id" class="insight-purchase"><RouterLink :to="`/purchases/${item.id}`">{{ item.product_name }}</RouterLink><strong>{{ money(item.price, settings.currency_code) }}</strong></div></section>
      <p class="small-muted insight-foot">These figures sum recorded purchase prices for active items. Quantity is not multiplied into the price.</p>
    </template>
    <div v-else class="panel state">No active purchases to analyze yet. <RouterLink to="/purchases/new">Add a purchase →</RouterLink></div>
  </div>
</template>
