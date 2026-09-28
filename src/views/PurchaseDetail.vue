<script setup>
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fileUrl, request, upload } from '../api'
import { dateLabel, daysUntil, deadlineLabel, errorMessage, money, safeLink, statusLabel } from '../utils'

const settings = inject('settings')
const route = useRoute()
const router = useRouter()
const item = ref(null)
const components = ref([])
const files = ref([])
const componentFiles = reactive({})
const componentFileErrors = reactive({})
const selectedPhotoId = ref(null)
const touchStart = ref(null)
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const busy = ref(false)
const fileType = ref('receipt')
const fileInput = ref(null)
const cameraInput = ref(null)
const editingComponent = ref(null)
const componentFormOpen = ref(false)
const componentForm = reactive({ name: '', description: '', price: '', currency_code: settings.currency_code,
  brand: '', model_number: '', serial_number: '', quantity: 1, link: '', warranty_expiry: '', warranty_type: '', notes: '', tags: '' })
const fileGroups = computed(() => ['photo', 'receipt', 'warranty', 'manual', 'other'].map(type => ({ type, entries: files.value.filter(file => file.file_type === type) })).filter(group => group.entries.length))
const photos = computed(() => {
  const componentFileIds = new Set(components.value.flatMap(part => (componentFiles[part.id] || []).map(file => file.id)))
  return files.value.filter(file => file.file_type === 'photo' && !componentFileIds.has(file.id))
})
const photoIndex = computed(() => Math.max(0, photos.value.findIndex(file => file.id === selectedPhotoId.value)))
const currentPhoto = computed(() => photos.value[photoIndex.value] || null)

function movePhoto(step) {
  if (photos.value.length < 2) return
  const next = (photoIndex.value + step + photos.value.length) % photos.value.length
  selectedPhotoId.value = photos.value[next].id
}

function startPhotoTouch(event) {
  const touch = event.changedTouches[0]
  touchStart.value = touch ? { x: touch.clientX, y: touch.clientY } : null
}

function endPhotoTouch(event) {
  if (!touchStart.value) return
  const touch = event.changedTouches[0]
  if (touch) {
    const dx = touch.clientX - touchStart.value.x
    const dy = touch.clientY - touchStart.value.y
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) movePhoto(dx < 0 ? 1 : -1)
  }
  touchStart.value = null
}

async function load() {
  loading.value = true; error.value = ''; actionError.value = ''
  selectedPhotoId.value = null
  try {
    const id = encodeURIComponent(route.params.id)
    const [purchase, parts, docs] = await Promise.all([
      request(`/purchases/${id}/`), request(`/components/${id}/`), request(`/files/${id}/`),
    ])
    item.value = purchase; components.value = parts; files.value = docs
    await Promise.all(parts.map(async part => {
      try { componentFiles[part.id] = await request(`/files/component/${encodeURIComponent(part.id)}/`); componentFileErrors[part.id] = '' }
      catch (e) { componentFiles[part.id] = []; componentFileErrors[part.id] = errorMessage(e) }
    }))
  } catch (e) { error.value = errorMessage(e) }
  finally { loading.value = false }
}
onMounted(load)
watch(() => route.params.id, load)

async function saveFile(event, path, type) {
  const selected = event.target.files?.[0]
  if (!selected) return
  actionError.value = ''; busy.value = true
  try {
    await upload(path, selected, type)
    if (path.includes('/component/')) {
      const componentId = path.split('/')[3]
      componentFiles[componentId] = await request(`/files/component/${componentId}/`)
      componentFileErrors[componentId] = ''
    } else {
      files.value = await request(`/files/${encodeURIComponent(route.params.id)}/`)
      item.value = await request(`/purchases/${encodeURIComponent(route.params.id)}/`)
    }
  } catch (e) { actionError.value = errorMessage(e) }
  finally { event.target.value = ''; busy.value = false }
}

async function deleteFile(file) {
  if (!window.confirm(`Delete ${file.filename}?`)) return
  actionError.value = ''; busy.value = true
  try {
    await request(`/files/${encodeURIComponent(route.params.id)}/${encodeURIComponent(file.id)}/`, { method: 'DELETE' })
    files.value = await request(`/files/${encodeURIComponent(route.params.id)}/`)
    item.value = await request(`/purchases/${encodeURIComponent(route.params.id)}/`)
  } catch (e) { actionError.value = errorMessage(e) }
  finally { busy.value = false }
}

async function deletePurchase() {
  if (!window.confirm(`Delete “${item.value.product_name}” and its attached files permanently?`)) return
  actionError.value = ''; busy.value = true
  try { await request(`/purchases/${encodeURIComponent(route.params.id)}/`, { method: 'DELETE' }); router.push('/purchases') }
  catch (e) { actionError.value = errorMessage(e); busy.value = false }
}

function openComponent(part = null) {
  editingComponent.value = part?.id || null
  Object.assign(componentForm, {
    name: part?.name || '', description: part?.description || '', price: part?.price || '',
    currency_code: part?.currency_code || item.value?.currency_code || settings.currency_code,
    brand: part?.brand || '', model_number: part?.model_number || '', serial_number: part?.serial_number || '',
    quantity: part?.quantity || 1, link: part?.link || '', warranty_expiry: part?.warranty_expiry || '',
    warranty_type: part?.warranty_type || '', notes: part?.notes || '', tags: part?.tags || '',
  })
  componentFormOpen.value = true; actionError.value = ''
}

async function saveComponent() {
  actionError.value = ''; busy.value = true
  try {
    const body = Object.fromEntries(Object.entries(componentForm).map(([key, value]) => [key, value === '' ? null : value]))
    body.name = componentForm.name.trim()
    body.price = String(componentForm.price || '0')
    body.quantity = Number(componentForm.quantity)
    if (!editingComponent.value) body.purchase_id = item.value.id
    await request(editingComponent.value ? `/components/${encodeURIComponent(editingComponent.value)}/` : '/components/', {
      method: editingComponent.value ? 'PUT' : 'POST', body,
    })
    components.value = await request(`/components/${encodeURIComponent(route.params.id)}/`)
    componentFormOpen.value = false
  } catch (e) { actionError.value = errorMessage(e) }
  finally { busy.value = false }
}

async function deleteComponent(part) {
  if (!window.confirm(`Delete component “${part.name}”?`)) return
  actionError.value = ''; busy.value = true
  try {
    await request(`/components/${encodeURIComponent(part.id)}/`, { method: 'DELETE' })
    components.value = components.value.filter(value => value.id !== part.id)
    files.value = await request(`/files/${encodeURIComponent(route.params.id)}/`)
  } catch (e) { actionError.value = errorMessage(e) }
  finally { busy.value = false }
}

function sizeLabel(size) { return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB` }
</script>

<template>
  <div class="page detail-page">
    <RouterLink to="/purchases" class="back-link">← All purchases</RouterLink>
    <div v-if="loading" class="panel state">Loading purchase…</div>
    <div v-else-if="error" class="panel state error" role="alert">{{ error }} <button class="text-button" @click="load">Try again</button></div>
    <template v-else-if="item">
      <div class="detail-heading"><div><div class="eyebrow">PURCHASE RECORD</div><h1>{{ item.product_name }}</h1><div class="heading-meta"><span class="status-chip" :class="item.item_status">{{ statusLabel(item.item_status) }}</span><span>{{ dateLabel(item.purchase_date, settings.date_format) }}</span><span v-if="item.retailer">· {{ item.retailer.name }}</span></div></div><RouterLink :to="`/purchases/${item.id}/edit`" class="button secondary">Edit purchase</RouterLink></div>
      <p v-if="actionError" class="notice error" role="alert">{{ actionError }}</p>
      <section v-if="photos.length" class="panel photo-slider" role="region" aria-roledescription="carousel" :aria-label="`Photos of ${item.product_name}`" tabindex="0" @keydown.left.prevent="movePhoto(-1)" @keydown.right.prevent="movePhoto(1)" @touchstart.passive="startPhotoTouch" @touchend.passive="endPhotoTouch" @touchcancel="touchStart = null">
        <div class="photo-slider-stage">
          <img :key="currentPhoto.id" :src="fileUrl(currentPhoto.id)" :alt="`${item.product_name}, photo ${photoIndex + 1} of ${photos.length}`" />
          <button v-if="photos.length > 1" type="button" class="photo-slider-arrow previous" aria-label="Previous photo" @click="movePhoto(-1)">‹</button>
          <button v-if="photos.length > 1" type="button" class="photo-slider-arrow next" aria-label="Next photo" @click="movePhoto(1)">›</button>
        </div>
        <div class="photo-slider-footer"><span class="photo-slider-count" aria-live="polite">{{ photoIndex + 1 }} / {{ photos.length }}</span><div v-if="photos.length > 1" class="photo-slider-thumbnails" aria-label="Choose a photo"><button v-for="(photo, index) in photos" :key="photo.id" type="button" :class="{ selected: index === photoIndex }" :aria-label="`Show photo ${index + 1} of ${photos.length}`" :aria-current="index === photoIndex ? 'true' : undefined" @click="selectedPhotoId = photo.id"><img :src="fileUrl(photo.id)" :alt="`${item.product_name}, thumbnail ${index + 1}`" loading="lazy" /></button></div></div>
      </section>
      <div class="detail-layout"><div class="detail-main">
        <section class="panel detail-card"><div class="panel-head"><div><span class="section-kicker">THE ESSENTIALS</span><h2>Purchase</h2></div><strong class="detail-price">{{ money(item.price, item.currency_code || settings.currency_code) }}</strong></div>
          <div class="facts"><div><span>Brand</span><strong>{{ item.brand?.name || '—' }}</strong></div><div><span>Retailer</span><strong>{{ item.retailer?.name || '—' }}</strong></div><div><span>Quantity</span><strong>{{ item.quantity || 1 }}</strong></div><div><span>Purchased</span><strong>{{ dateLabel(item.purchase_date, settings.date_format) }}</strong></div><div v-if="item.model_number"><span>Model</span><strong>{{ item.model_number }}</strong></div><div v-if="item.serial_number"><span>Serial</span><strong>{{ item.serial_number }}</strong></div><div v-if="item.retailer_order_number"><span>Order number</span><strong>{{ item.retailer_order_number }}</strong></div><div v-if="item.tax_deductible"><span>Tax</span><strong>Tax deductible</strong></div><div v-if="safeLink(item.link)"><span>Product</span><a :href="safeLink(item.link)" target="_blank" rel="noopener noreferrer">Open link ↗</a></div></div>
          <p v-if="item.notes" class="item-notes">{{ item.notes }}</p><div v-if="item.tags" class="tags"><span v-for="tag in item.tags.split(',').map(t => t.trim()).filter(Boolean)" :key="tag" class="tag">{{ tag }}</span></div>
        </section>
        <section class="panel detail-card"><div class="panel-head"><div><span class="section-kicker">IN THE BOX</span><h2>Components <span class="heading-count">{{ components.length }}</span></h2></div><button class="button small secondary" @click="openComponent()">+ Add component</button></div>
          <p v-if="!components.length" class="empty-inline">Add parts of this purchase that have their own price, warranty or files.</p>
          <div v-for="part in components" :key="part.id" class="component-row"><div class="component-title"><strong>{{ part.name }}</strong><span>{{ money(part.price, part.currency_code || item.currency_code) }}<template v-if="part.quantity > 1"> · Qty {{ part.quantity }}</template></span></div><p v-if="part.description">{{ part.description }}</p><div class="component-meta"><span v-if="part.brand">{{ part.brand }}</span><span v-if="part.model_number">Model {{ part.model_number }}</span><span v-if="part.serial_number">Serial {{ part.serial_number }}</span><span v-if="part.warranty_expiry">Warranty until {{ dateLabel(part.warranty_expiry, settings.date_format) }}</span><span v-if="part.warranty_type">{{ part.warranty_type }}</span><a v-if="safeLink(part.link)" :href="safeLink(part.link)" target="_blank" rel="noopener noreferrer">Product link ↗</a></div><p v-if="part.notes" class="item-notes">{{ part.notes }}</p><p v-if="part.tags" class="small-muted">Tags: {{ part.tags }}</p>
            <div class="component-files"><a v-for="file in componentFiles[part.id] || []" :key="file.id" :href="fileUrl(file.id)" target="_blank" rel="noopener noreferrer" class="file-chip">↗ {{ file.filename }}</a><label class="text-button upload-inline">+ Attach file<input type="file" hidden :disabled="busy" @change="saveFile($event, `/files/component/${part.id}/`, 'other')" /></label></div><p v-if="componentFileErrors[part.id]" class="field-error" role="alert">Could not load component files: {{ componentFileErrors[part.id] }}</p>
            <div class="row-actions"><button class="text-button" @click="openComponent(part)">Edit</button><button class="text-button danger-text" @click="deleteComponent(part)">Delete</button></div></div>
        </section>
        <section class="panel detail-card"><div class="panel-head"><div><span class="section-kicker">DOCUMENTS & IMAGES</span><h2>Files <span class="heading-count">{{ files.length }}</span></h2></div></div>
          <div class="upload-bar"><label>File type<select v-model="fileType"><option v-for="type in ['receipt','photo','warranty','manual','other']" :key="type" :value="type">{{ statusLabel(type) }}</option></select></label><button class="button secondary" :disabled="busy" @click="fileInput?.click()">+ Upload file</button><button class="button quiet" :disabled="busy" @click="cameraInput?.click()">Take receipt photo</button><input ref="fileInput" class="sr-only" type="file" @change="saveFile($event, `/files/${item.id}/`, fileType)" /><input ref="cameraInput" class="sr-only" type="file" accept="image/*" capture="environment" @change="saveFile($event, `/files/${item.id}/`, 'receipt')" /></div><p class="form-hint">Receipts, manuals, photos and warranty cards · up to 10 MB per file</p>
          <p v-if="!files.length" class="empty-inline">No files yet. Add a receipt now so it is easy to find later.</p>
          <div v-for="group in fileGroups" :key="group.type" class="file-group"><h3>{{ statusLabel(group.type) }}{{ group.entries.length === 1 ? '' : 's' }}</h3><div class="file-list"><div v-for="file in group.entries" :key="file.id" class="file-row"><a :href="fileUrl(file.id)" target="_blank" rel="noopener noreferrer" class="file-name"><img v-if="file.mime_type?.startsWith('image/')" :src="fileUrl(file.id)" alt="" class="file-preview" /><span v-else class="file-icon">▤</span><span>{{ file.filename }}<small>{{ sizeLabel(file.file_size) }}</small></span></a><button class="text-button danger-text" :disabled="busy" @click="deleteFile(file)">Delete</button></div></div></div>
        </section>
      </div><aside class="detail-side"><section class="panel side-card"><span class="section-kicker">AFTER PURCHASE</span><h2>Coverage & returns</h2><div class="deadline-block"><span>Warranty</span><strong v-if="item.warranty">{{ item.warranty.warranty_end === '9999-12-31' ? 'Lifetime' : dateLabel(item.warranty.warranty_end, settings.date_format) }}</strong><strong v-else>No warranty</strong><span v-if="item.warranty" class="coverage-state" :class="item.warranty.status.toLowerCase()">{{ statusLabel(item.warranty.status) }}<template v-if="item.warranty.status === 'ACTIVE' && item.warranty.warranty_end !== '9999-12-31'"> · {{ deadlineLabel(daysUntil(item.warranty.warranty_end)) }}</template></span></div><div class="deadline-block"><span>Return deadline</span><strong>{{ dateLabel(item.return_deadline, settings.date_format) }}</strong><span v-if="item.return_deadline" class="small-muted">{{ deadlineLabel(daysUntil(item.return_deadline)) }}</span><span v-if="item.return_policy" class="small-muted">{{ item.return_policy }}</span></div></section>
        <div class="danger-action"><button class="text-button danger-text" :disabled="busy" @click="deletePurchase">Delete purchase</button></div>
      </aside></div>
    </template>
    <div v-if="componentFormOpen" class="dialog-backdrop" @click.self="componentFormOpen = false"><form class="dialog panel component-dialog" @submit.prevent="saveComponent"><h2>{{ editingComponent ? 'Edit component' : 'Add component' }}</h2><p class="subtle">A part with its own details and files.</p><div class="form-grid"><label class="full">Name <span class="required">*</span><input v-model="componentForm.name" required /></label><label>Price<input v-model="componentForm.price" type="number" step="0.01" min="0" placeholder="0.00" /></label><label>Currency<input v-model="componentForm.currency_code" maxlength="3" /></label><label>Quantity<input v-model.number="componentForm.quantity" type="number" min="1" step="1" /></label><label>Brand<input v-model="componentForm.brand" /></label><label>Model number<input v-model="componentForm.model_number" /></label><label>Serial number<input v-model="componentForm.serial_number" /></label><label>Warranty expiry<input v-model="componentForm.warranty_expiry" type="date" /></label><label>Warranty type<input v-model="componentForm.warranty_type" /></label><label class="full">Product link<input v-model="componentForm.link" type="url" /></label><label class="full">Description<textarea v-model="componentForm.description" rows="2"></textarea></label><label class="full">Notes<textarea v-model="componentForm.notes" rows="2"></textarea></label><label class="full">Tags <span class="label-note">comma separated</span><input v-model="componentForm.tags" /></label></div><p v-if="actionError" class="field-error" role="alert">{{ actionError }}</p><div class="form-actions"><button type="button" class="button quiet" @click="componentFormOpen = false; actionError = ''">Cancel</button><button class="button primary" :disabled="busy" type="submit">{{ busy ? 'Saving…' : 'Save component' }}</button></div></form></div>
  </div>
</template>
