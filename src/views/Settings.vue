<script setup>
import { inject, onMounted, reactive, ref } from 'vue'
import { allPages, request, upload } from '../api'
import { errorMessage } from '../utils'

const settings = inject('settings')
const theme = inject('theme')
const form = reactive({ currency_code: settings.currency_code, date_format: settings.date_format })
const retailers = ref([])
const brands = ref([])
const backups = ref([])
const backupError = ref('')
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const message = ref('')
const edit = reactive({ type: '', id: null, name: '', url: '' })
const importType = ref('json')
const importInput = ref(null)
const confirmReset = ref('')

async function load() {
  loading.value = true; error.value = ''
  try {
    const [current, r, b] = await Promise.all([request('/settings/'), allPages('/retailers/', 100), allPages('/brands/', 100)])
    Object.assign(settings, current); Object.assign(form, current)
    retailers.value = r; brands.value = b
  } catch (e) { error.value = errorMessage(e) }
  finally { loading.value = false }
  await loadBackups()
}
onMounted(load)
async function loadBackups() {
  backupError.value = ''
  try {
    const data = await request('/export/backup/list')
    backups.value = Array.isArray(data) ? data : Array.isArray(data?.backups) ? data.backups : Array.isArray(data?.items) ? data.items : []
  } catch (e) { backups.value = []; backupError.value = errorMessage(e) }
}
function backupLabel(value) {
  if (typeof value === 'string') return value
  return value?.filename || value?.name || JSON.stringify(value)
}
async function perform(action, success) {
  error.value = ''; message.value = ''; busy.value = true
  try { await action(); message.value = success }
  catch (e) { error.value = errorMessage(e) }
  finally { busy.value = false }
}
async function saveSettings() {
  await perform(async () => {
    const submitted = { currency_code: form.currency_code.trim().toUpperCase(), date_format: form.date_format }
    const value = await request('/settings/', { method: 'PUT', body: submitted })
    Object.assign(settings, value || submitted)
    Object.assign(form, value || submitted)
  }, 'Preferences saved.')
}
async function resetSettings() {
  await perform(async () => {
    const value = await request('/settings/reset', { method: 'POST' })
    if (value?.currency_code) { Object.assign(settings, value); Object.assign(form, value) }
    else { const current = await request('/settings/'); Object.assign(settings, current); Object.assign(form, current) }
  }, 'Preferences reset to defaults.')
}
function openEntity(type, value = null) {
  Object.assign(edit, { type, id: value?.id || null, name: value?.name || '', url: value?.url || '' })
  error.value = ''; message.value = ''
}
async function saveEntity() {
  const type = edit.type
  const id = edit.id
  await perform(async () => {
    const item = await request(id ? `/${type}/${encodeURIComponent(id)}` : `/${type}/`, {
      method: id ? 'PUT' : 'POST', body: { name: edit.name.trim(), url: edit.url || null },
    })
    const list = type === 'retailers' ? retailers : brands
    if (id) list.value = list.value.map(value => value.id === id ? item : value)
    else list.value.push(item)
    edit.type = ''
  }, `${type === 'retailers' ? 'Retailer' : 'Brand'} saved.`)
}
async function deleteEntity(type, item) {
  if (!window.confirm(`Delete ${item.name}? This may fail if purchases reference it.`)) return
  await perform(async () => {
    await request(`/${type}/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
    const list = type === 'retailers' ? retailers : brands
    list.value = list.value.filter(value => value.id !== item.id)
  }, 'Deleted.')
}
async function saveBackup() {
  await perform(async () => { await request('/export/backup/save', { method: 'POST' }); await loadBackups() }, 'Backup saved on the server.')
}
async function importData(event) {
  const file = event.target.files?.[0]
  if (!file) return
  event.target.value = ''
  const type = importType.value
  const prompt = type === 'zip'
    ? 'Restore this ZIP backup? It will overwrite the current data and files.'
    : `Import ${file.name} as ${type.toUpperCase()}? Review your export first if you may need to undo this.`
  if (!window.confirm(prompt)) return
  await perform(async () => {
    await upload(`/import/${type}`, file)
    await load()
    if (error.value) throw new Error(error.value)
  }, 'Import completed. The collection has been refreshed.')
}
async function resetAll() {
  if (confirmReset.value !== 'DELETE ALL') return
  if (!window.confirm('Final confirmation: permanently delete every purchase and file?')) return
  await perform(async () => {
    await request('/data/reset-all', { method: 'POST' })
    confirmReset.value = ''
    await load()
    if (error.value) throw new Error(error.value)
  }, 'All purchase data and files have been deleted.')
}
</script>

<template>
  <div class="page settings-page"><div class="page-head"><div><div class="eyebrow">MAKE IT YOURS</div><h1>Settings & data</h1><p class="subtle">Preferences, names, exports and backups.</p></div></div>
    <div v-if="loading" class="panel state">Loading settings…</div>
    <template v-else>
      <p v-if="error" class="notice error" role="alert">{{ error }} <button class="text-button" @click="load">Try again</button></p><p v-if="message" class="notice success" role="status">{{ message }}</p>
      <section class="panel settings-section"><div class="panel-head"><div><span class="section-kicker">DISPLAY</span><h2>Preferences</h2></div></div><p class="small-muted">All new purchases and components use the app currency. Changing it does not convert existing amounts; older records in another currency are excluded from spending totals until you enter converted amounts.</p><form class="form-grid" @submit.prevent="saveSettings"><label>App currency<input v-model="form.currency_code" required minlength="3" maxlength="3" pattern="[A-Za-z]{3}" placeholder="EUR" autocapitalize="characters" /></label><label>Date format<select v-model="form.date_format"><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select></label><label>Appearance<select v-model="theme"><option value="light">Light</option><option value="dark">Dark</option></select></label><div class="full form-actions left-actions"><button class="button primary" :disabled="busy" type="submit">Save preferences</button><button class="button quiet" :disabled="busy" type="button" @click="resetSettings">Reset preferences</button></div></form></section>
      <div class="settings-grid"><section v-for="section in [{ type: 'retailers', label: 'Retailers', items: retailers }, { type: 'brands', label: 'Brands', items: brands }]" :key="section.type" class="panel settings-section"><div class="panel-head"><div><span class="section-kicker">ORGANIZE</span><h2>{{ section.label }}</h2></div><button class="button secondary small" @click="openEntity(section.type)">+ Add</button></div><p v-if="!section.items.length" class="empty-inline">None yet.</p><div v-for="item in section.items" :key="item.id" class="entity-row"><span>{{ item.name }}</span><div><button class="text-button" @click="openEntity(section.type, item)">Edit</button><button class="text-button danger-text" @click="deleteEntity(section.type, item)">Delete</button></div></div></section></div>
      <section class="panel settings-section"><div class="panel-head"><div><span class="section-kicker">YOUR DATA</span><h2>Export & backup</h2></div></div><p class="small-muted">Download an export or save a full backup on the server.</p><div class="button-row"><a href="/api/export/json" class="button secondary" download>Export JSON</a><a href="/api/export/csv" class="button secondary" download>Export CSV</a><a href="/api/export/zip" class="button secondary" download>Download full ZIP</a><button class="button quiet" :disabled="busy" @click="saveBackup">Save server backup</button></div><p v-if="backupError" class="field-error" role="alert">Could not load server backups: {{ backupError }} <button class="text-button" @click="loadBackups">Retry</button></p><div v-if="backups.length" class="backup-list"><h3>Server backups</h3><div v-for="(value, index) in backups" :key="index">{{ backupLabel(value) }}</div></div></section>
      <section class="panel settings-section"><div class="panel-head"><div><span class="section-kicker">BRING DATA IN</span><h2>Import</h2></div></div><p class="small-muted">Choose a format, then select a file. Restoring a full ZIP overwrites current data and files.</p><div class="button-row"><label>Format<select v-model="importType"><option value="json">JSON</option><option value="csv">CSV</option><option value="amazon-csv">Amazon order CSV</option><option value="zip">Full ZIP restore</option></select></label><button class="button secondary" :disabled="busy" @click="importInput?.click()">Choose file…</button><input ref="importInput" class="sr-only" type="file" :accept="importType === 'zip' ? '.zip' : importType === 'json' ? '.json' : '.csv'" @change="importData" /></div></section>
      <section class="panel settings-section danger-zone"><div class="panel-head"><div><span class="section-kicker">DANGER ZONE</span><h2>Delete all data</h2></div></div><p>Permanent deletion of all purchases and attached files. Download a full ZIP backup first if you need a copy.</p><label>Type <strong>DELETE ALL</strong> to confirm<input v-model="confirmReset" autocomplete="off" placeholder="DELETE ALL" /></label><button class="button danger" :disabled="busy || confirmReset !== 'DELETE ALL'" @click="resetAll">Delete all data and files</button></section>
    </template>
    <div v-if="edit.type" class="dialog-backdrop" @click.self="edit.type = ''"><form class="dialog panel" @submit.prevent="saveEntity"><h2>{{ edit.id ? 'Edit' : 'Add' }} {{ edit.type === 'retailers' ? 'retailer' : 'brand' }}</h2><label>Name<input v-model="edit.name" required /></label><label>Website <span class="label-note">optional</span><input v-model="edit.url" type="url" placeholder="https://…" /></label><p v-if="error" class="field-error" role="alert">{{ error }}</p><div class="form-actions"><button type="button" class="button quiet" @click="edit.type = ''">Cancel</button><button type="submit" class="button primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save' }}</button></div></form></div>
  </div>
</template>
