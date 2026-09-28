<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { allPages } from '../api'
import { activePurchases, dateLabel, daysUntil, deadlineLabel, errorMessage, money, photo, price, totalsByCurrency } from '../utils'

const settings = inject('settings')
const items = ref([])
const loading = ref(true)
const error = ref('')
async function load() {
  loading.value = true; error.value = ''
  try { items.value = await allPages('/purchases/') }
  catch (e) { error.value = errorMessage(e) }
  finally { loading.value = false }
}
onMounted(load)
const active = computed(() => activePurchases(items.value))
const returns = computed(() => active.value.filter(p => p.return_deadline && daysUntil(p.return_deadline) >= 0 && daysUntil(p.return_deadline) <= 30)
  .sort((a, b) => a.return_deadline.localeCompare(b.return_deadline)))
const warranties = computed(() => active.value.filter(p => p.warranty?.status === 'ACTIVE' && p.warranty.warranty_end !== '9999-12-31' && daysUntil(p.warranty.warranty_end) >= 0 && daysUntil(p.warranty.warranty_end) <= 30)
  .sort((a, b) => a.warranty.warranty_end.localeCompare(b.warranty.warranty_end)))
const recent = computed(() => [...items.value].sort((a, b) => (b.created_at || b.purchase_date).localeCompare(a.created_at || a.purchase_date)).slice(0, 5))
const totals = computed(() => totalsByCurrency(active.value))
</script>

<template>
  <div class="page">
    <div class="page-head"><div><div class="eyebrow">YOUR SPACE</div><h1>Overview</h1><p class="subtle">A clear view of what you own and what needs attention.</p></div><RouterLink to="/purchases/new" class="button primary desktop-add">+ Add purchase</RouterLink></div>
    <div v-if="loading" class="panel state">Loading your purchases…</div>
    <div v-else-if="error" class="panel state error" role="alert">{{ error }} <button class="text-button" @click="load">Try again</button></div>
    <template v-else>
      <div class="summary-strip">
        <div><span class="metric-label">ACTIVE PURCHASES</span><strong>{{ active.length }}</strong><RouterLink to="/purchases">View collection →</RouterLink></div>
        <div><span class="metric-label">RECORDED SPENDING · ACTIVE</span><strong class="total-numbers">{{ totals.length ? totals.map(([code, value]) => money(value, code)).join(' · ') : '—' }}</strong><span class="metric-foot">In original purchase currencies</span></div>
        <div><span class="metric-label">NEEDS ATTENTION · NEXT 30 DAYS</span><strong>{{ returns.length + warranties.length }}</strong><span class="metric-foot">Return and warranty deadlines</span></div>
      </div>
      <div class="home-grid">
        <section class="panel attention"><div class="panel-head"><div><span class="section-kicker amber">TIME SENSITIVE</span><h2>Return windows</h2></div><span class="count">{{ returns.length }}</span></div>
          <div v-if="returns.length" class="stack-list"><RouterLink v-for="item in returns.slice(0, 6)" :key="item.id" :to="`/purchases/${item.id}`" class="attention-row"><span class="row-name">{{ item.product_name }}<small>{{ dateLabel(item.return_deadline, settings.date_format) }}</small></span><span class="due-pill" :class="{ urgent: daysUntil(item.return_deadline) <= 3 }">{{ deadlineLabel(daysUntil(item.return_deadline)) }}</span></RouterLink><RouterLink v-if="returns.length > 6" :to="{ path: '/purchases', query: { due: 'returns' } }" class="text-link">See all {{ returns.length }} →</RouterLink></div>
          <p v-else class="empty-inline">No return deadlines in the next 30 days.</p>
        </section>
        <section class="panel attention"><div class="panel-head"><div><span class="section-kicker teal">COVERAGE</span><h2>Warranties ending</h2></div><span class="count">{{ warranties.length }}</span></div>
          <div v-if="warranties.length" class="stack-list"><RouterLink v-for="item in warranties.slice(0, 6)" :key="item.id" :to="`/purchases/${item.id}`" class="attention-row"><span class="row-name">{{ item.product_name }}<small>{{ dateLabel(item.warranty.warranty_end, settings.date_format) }}</small></span><span class="due-pill" :class="{ urgent: daysUntil(item.warranty.warranty_end) <= 3 }">{{ deadlineLabel(daysUntil(item.warranty.warranty_end)) }}</span></RouterLink><RouterLink v-if="warranties.length > 6" :to="{ path: '/purchases', query: { due: 'warranties' } }" class="text-link">See all {{ warranties.length }} →</RouterLink></div>
          <p v-else class="empty-inline">No warranties end in the next 30 days.</p>
        </section>
      </div>
      <section class="panel recent-panel"><div class="panel-head"><div><span class="section-kicker">YOUR COLLECTION</span><h2>Recently added</h2></div><RouterLink to="/purchases" class="text-link">All purchases →</RouterLink></div>
        <div v-if="recent.length" class="recent-list"><RouterLink v-for="item in recent" :key="item.id" :to="`/purchases/${item.id}`" class="recent-row"><img v-if="photo(item)" :src="photo(item)" alt="" class="mini-photo" /><div v-else class="mini-photo no-photo">▦</div><div class="recent-info"><strong>{{ item.product_name }}</strong><small>{{ item.brand?.name || item.retailer?.name || 'Purchase' }} · {{ dateLabel(item.purchase_date, settings.date_format) }}</small></div><span class="recent-price">{{ price(item, settings) }}</span><span class="row-arrow">↗</span></RouterLink></div>
        <div v-else class="empty-inline">Your collection is empty. <RouterLink to="/purchases/new">Add your first purchase →</RouterLink></div>
      </section>
    </template>
  </div>
</template>
