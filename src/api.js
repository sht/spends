export class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body instanceof FormData ? undefined : body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }
  if (!response.ok) {
    let error
    try { error = await response.json() } catch { /* A server error may not be JSON. */ }
    const details = Array.isArray(error?.detail) ? error.detail.map(item => ({
      field: Array.isArray(item.loc) ? item.loc.filter(part => part !== 'body').join('.') : '',
      message: item.msg || 'Invalid value',
    })) : []
    const message = details.length ? 'Please check the highlighted fields.'
      : typeof error?.detail === 'string' ? error.detail
      : `Request failed (${response.status}). Please try again.`
    throw new ApiError(message, response.status, details)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export async function allPages(path, limit = 1000) {
  const separator = path.includes('?') ? '&' : '?'
  const first = await request(`${path}${separator}skip=0&limit=${limit}`)
  const items = [...(first.items || [])]
  // Protect against incomplete data if a server enforces a smaller page limit.
  while (items.length < (first.total || 0)) {
    const page = await request(`${path}${separator}skip=${items.length}&limit=${limit}`)
    if (!page.items?.length) break
    items.push(...page.items)
  }
  return items
}

export function upload(path, file, fileType) {
  if (path.startsWith('/files/') && file.size > 10 * 1024 * 1024) throw new ApiError('Files must be 10 MB or smaller.', 0)
  const body = new FormData()
  body.append('file', file)
  if (fileType) body.append('file_type', fileType)
  return request(path, { method: 'POST', body })
}

export function fileUrl(id) { return `/api/files/file/${encodeURIComponent(id)}/download/` }
