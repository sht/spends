export function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function daysUntil(iso) {
  // Local calendar dates avoid UTC conversion shifting deadlines by a day.
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const [ty, tm, td] = today().split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000)
}

export function dateLabel(iso, format = 'MM/DD/YYYY') {
  if (!iso) return '—'
  if (iso.startsWith('9999-12-31')) return 'Lifetime'
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (format === 'DD/MM/YYYY') return `${d}/${m}/${y}`
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`
  return `${m}/${d}/${y}`
}

export function money(value, currency = 'USD') {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount) }
  catch { return `${amount.toFixed(2)} ${currency}` }
}

export function price(purchase, settings) { return money(purchase.price, purchase.currency_code || settings.currency_code) }

export function deadlineLabel(days) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 0) return `${Math.abs(days)}d ago`
  return `In ${days}d`
}

export function errorMessage(error) {
  return error?.details?.length
    ? error.details.map(detail => `${detail.field ? detail.field + ': ' : ''}${detail.message}`).join(' · ')
    : error?.message || 'Something went wrong.'
}

export function statusLabel(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '—' }

export function activePurchases(items) { return items.filter(p => p.item_status === 'active') }

export function currencyMismatch(item, currency) {
  return Boolean(item.currency_code && item.currency_code.toUpperCase() !== currency.toUpperCase())
}

export function spendingInCurrency(items, currency) {
  return items.filter(item => !currencyMismatch(item, currency))
    .reduce((sum, item) => sum + Number(item.price || 0), 0)
}

export function photo(purchase) { return purchase.photo_id ? `/api/files/file/${encodeURIComponent(purchase.photo_id)}/download/` : '' }

export function safeLink(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : '' }
  catch { return '' }
}
