<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { allPages, request } from '../api'
import { currencyMismatch, errorMessage, today } from '../utils'

const route = useRoute()
const router = useRouter()
const settings = inject('settings')
const editing = computed(() => Boolean(route.params.id))
const retailers = ref([])
const brands = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const fields = ref({})
const adding = ref('')
const newName = ref('')
const addError = ref('')
const convertLegacy = ref(false)
const form = reactive({
  product_name: '', price: '', currency_code: settings.currency_code, purchase_date: today(),
  retailer_id: '', brand_id: '', model_number: '', serial_number: '', retailer_order_number: '',
  quantity: 1, link: '', return_deadline: '', return_policy: '', notes: '', tags: '',
  tax_deductible: false, item_status: 'active', warranty_type: 'LIMITED', warranty_expiry: '', has_warranty: false,
})
const legacyCurrency = computed(() => editing.value && currencyMismatch(form, settings.currency_code))
let original = null

async function load() {
  loading.value = true; error.value = ''
  try {
    const [r, b, currentSettings, item] = await Promise.all([
      allPages('/retailers/', 100), allPages('/brands/', 100), request('/settings/'),
      editing.value ? request(`/purchases/${route.params.id}/`) : Promise.resolve(null),
    ])
    retailers.value = r; brands.value = b
    if (!item) form.currency_code = currentSettings.currency_code
    if (item) {
      Object.assign(form, {
        ...item, retailer_id: item.retailer_id || '', brand_id: item.brand_id || '',
        tax_deductible: Boolean(item.tax_deductible), warranty_type: item.warranty?.warranty_type || 'LIMITED',
        warranty_expiry: item.warranty?.warranty_end === '9999-12-31' ? '' : (item.warranty?.warranty_end || ''),
        has_warranty: Boolean(item.warranty), return_deadline: item.return_deadline || '',
      })
      original = payload()
    }
  } catch (e) { error.value = errorMessage(e) }
  finally { loading.value = false }
}
onMounted(load)

function payload() {
  return {
    product_name: form.product_name.trim(), price: String(form.price), currency_code: convertLegacy.value ? settings.currency_code : form.currency_code.trim().toUpperCase(),
    purchase_date: form.purchase_date, retailer_id: form.retailer_id || null, brand_id: form.brand_id || null,
    model_number: form.model_number || null, serial_number: form.serial_number || null,
    retailer_order_number: form.retailer_order_number || null, quantity: Number(form.quantity), link: form.link || null,
    return_deadline: form.return_deadline || null, return_policy: form.return_policy || null,
    notes: form.notes || null, tags: form.tags || null, tax_deductible: form.tax_deductible ? 1 : 0,
    item_status: form.item_status, warranty_expiry: form.has_warranty
      ? form.warranty_type.toUpperCase() === 'LIFETIME' ? '9999-12-31' : (form.warranty_expiry || null)
      : null,
    warranty_type: form.has_warranty ? form.warranty_type.trim().toUpperCase() : null,
  }
}

async function save() {
  error.value = ''; fields.value = {}
  if (form.has_warranty && form.warranty_type.toUpperCase() !== 'LIFETIME' && !form.warranty_expiry) {
    fields.value = { warranty_expiry: 'Enter an expiry date, or choose Lifetime.' }; return
  }
  saving.value = true
  try {
    const data = payload()
    const body = editing.value ? Object.fromEntries(Object.entries(data).filter(([key, value]) => value !== original[key])) : data
    if (editing.value && !Object.keys(body).length) { router.push(`/purchases/${route.params.id}`); return }
    const item = await request(editing.value ? `/purchases/${route.params.id}/` : '/purchases/', { method: editing.value ? 'PUT' : 'POST', body })
    router.push(`/purchases/${item?.id || route.params.id}`)
  } catch (e) {
    error.value = e.message
    fields.value = Object.fromEntries((e.details || []).map(detail => [detail.field.split('.').pop(), detail.message]))
    if (e.details?.length) window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally { saving.value = false }
}

async function addEntity(type) {
  addError.value = ''
  if (!newName.value.trim()) { addError.value = 'Enter a name.'; return }
  try {
    const item = await request(`/${type}/`, { method: 'POST', body: { name: newName.value.trim() } })
    if (type === 'retailers') { retailers.value.push(item); form.retailer_id = item.id }
    else { brands.value.push(item); form.brand_id = item.id }
    adding.value = ''; newName.value = ''
  } catch (e) { addError.value = errorMessage(e) }
}
</script>

<template>
  <div class="page narrow-page">
    <RouterLink :to="editing ? `/purchases/${route.params.id}` : '/purchases'" class="back-link">← {{ editing ? 'Back to purchase' : 'All purchases' }}</RouterLink>
    <div class="page-head"><div><div class="eyebrow">{{ editing ? 'UPDATE THE RECORD' : 'A NEW ADDITION' }}</div><h1>{{ editing ? 'Edit purchase' : 'Add a purchase' }}</h1><p class="subtle">{{ editing ? 'Update the details below.' : 'Start with the essentials. Add photos and documents after saving.' }}</p></div></div>
    <div v-if="loading" class="panel state">Loading form…</div>
    <div v-else-if="error && !form.product_name && editing" class="panel state error" role="alert">{{ error }} <button class="text-button" @click="load">Try again</button></div>
    <form v-else @submit.prevent="save">
      <div v-if="error" class="notice error" role="alert">{{ error }}<span v-if="Object.keys(fields).length"> Review the fields below.</span></div>
      <section class="panel form-section"><div class="form-section-head"><span class="step-number">01</span><div><h2>Purchase details</h2><p>The item and when you bought it.</p></div></div>
        <div class="form-grid">
          <label class="full">Product name <span class="required">*</span><input v-model="form.product_name" required maxlength="250" placeholder="e.g. Sony WH-1000XM5" /><small v-if="fields.product_name" class="field-error">{{ fields.product_name }}</small></label>
          <label>Price ({{ legacyCurrency && !convertLegacy ? form.currency_code : settings.currency_code }}) <span class="required">*</span><input v-model="form.price" required type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" /><small v-if="fields.price" class="field-error">{{ fields.price }}</small></label>
          <label v-if="legacyCurrency" class="check-row full"><input v-model="convertLegacy" type="checkbox" /><span>I entered the equivalent amount in {{ settings.currency_code }}. Include this purchase in spending totals.</span></label>
          <p v-if="legacyCurrency" class="form-hint full">This purchase was recorded in {{ form.currency_code }}. Checking the box changes its currency label; enter the converted amount first. No exchange rate is applied automatically.</p>
          <label>Purchase date <span class="required">*</span><input v-model="form.purchase_date" required type="date" :max="today()" /><small v-if="fields.purchase_date" class="field-error">{{ fields.purchase_date }}</small></label>
          <label>Quantity<input v-model.number="form.quantity" type="number" min="1" step="1" /><small v-if="fields.quantity" class="field-error">{{ fields.quantity }}</small></label>
          <div class="field-with-action"><label>Retailer<select v-model="form.retailer_id"><option value="">None</option><option v-for="item in retailers" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><button type="button" class="text-button" @click="adding = 'retailers'; newName = ''; addError = ''">+ New retailer</button></div>
          <div class="field-with-action"><label>Brand<select v-model="form.brand_id"><option value="">None</option><option v-for="item in brands" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><button type="button" class="text-button" @click="adding = 'brands'; newName = ''; addError = ''">+ New brand</button></div>
          <label>Model number<input v-model="form.model_number" placeholder="Optional" /><small v-if="fields.model_number" class="field-error">{{ fields.model_number }}</small></label>
          <label>Serial number<input v-model="form.serial_number" placeholder="Optional" /><small v-if="fields.serial_number" class="field-error">{{ fields.serial_number }}</small></label>
          <label>Order number<input v-model="form.retailer_order_number" placeholder="Optional" /><small v-if="fields.retailer_order_number" class="field-error">{{ fields.retailer_order_number }}</small></label>
          <label>Product link<input v-model="form.link" type="url" placeholder="https://…" /><small v-if="fields.link" class="field-error">{{ fields.link }}</small></label>
        </div>
      </section>
      <section class="panel form-section"><div class="form-section-head"><span class="step-number">02</span><div><h2>Coverage & returns</h2><p>Dates you may need later.</p></div></div>
        <div class="form-grid"><label>Return deadline<input v-model="form.return_deadline" type="date" /><small v-if="fields.return_deadline" class="field-error">{{ fields.return_deadline }}</small></label><label>Return policy<input v-model="form.return_policy" placeholder="e.g. 30 days" /></label>
          <label class="check-row full"><input v-model="form.has_warranty" type="checkbox" /><span>This purchase has a warranty</span></label>
          <template v-if="form.has_warranty"><label>Warranty type<input v-model="form.warranty_type" placeholder="LIMITED, EXTENDED, LIFETIME…" /></label><label v-if="form.warranty_type.toUpperCase() !== 'LIFETIME'">Warranty expiry<input v-model="form.warranty_expiry" type="date" required /><small v-if="fields.warranty_expiry" class="field-error">{{ fields.warranty_expiry }}</small></label><p v-else class="form-hint">Lifetime coverage has no expiry date.</p></template>
        </div>
      </section>
      <section class="panel form-section"><div class="form-section-head"><span class="step-number">03</span><div><h2>Organize</h2><p>Extra detail to make it easier to find.</p></div></div>
        <div class="form-grid"><label>Item status<select v-model="form.item_status"><option v-for="value in ['active','sold','lost','donated','disposed']" :key="value" :value="value">{{ value.charAt(0).toUpperCase() + value.slice(1) }}</option></select></label><label>Tags <span class="label-note">comma separated</span><input v-model="form.tags" placeholder="audio, travel" /></label><label class="check-row full"><input v-model="form.tax_deductible" type="checkbox" /><span>Tax deductible</span></label><label class="full">Notes<textarea v-model="form.notes" rows="4" placeholder="Anything worth remembering…"></textarea></label></div>
      </section>
      <div class="form-actions"><RouterLink :to="editing ? `/purchases/${route.params.id}` : '/purchases'" class="button quiet">Cancel</RouterLink><button type="submit" class="button primary" :disabled="saving">{{ saving ? 'Saving…' : editing ? 'Save changes' : 'Save purchase' }}</button></div>
    </form>
    <div v-if="adding" class="dialog-backdrop" @click.self="adding = ''"><form class="dialog panel" @submit.prevent="addEntity(adding)"><h2>New {{ adding === 'retailers' ? 'retailer' : 'brand' }}</h2><label>Name<input v-model="newName" required autofocus placeholder="Enter a name" /></label><p v-if="addError" class="field-error" role="alert">{{ addError }}</p><div class="form-actions"><button type="button" class="button quiet" @click="adding = ''">Cancel</button><button class="button primary" type="submit">Add</button></div></form></div>
  </div>
</template>
