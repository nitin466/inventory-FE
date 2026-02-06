const API_BASE = import.meta.env.VITE_API_URL ?? ''

function buildQuery(params) {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.asOf) search.set('asOf', params.asOf)
  if (params.categoryId) search.set('categoryId', params.categoryId)
  const q = search.toString()
  return q ? `?${q}` : ''
}

/**
 * GET /reports/sales-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @param {{ from?: string, to?: string }} options - Optional date range (YYYY-MM-DD)
 * @returns {Promise<object>} Parsed JSON response
 * @throws {Error} On fetch failure or non-OK response
 */
export async function getSalesSummary({ from, to } = {}) {
  const query = buildQuery({ from, to })
  const url = `${API_BASE}/reports/sales-summary${query}`
  try {
    const res = await fetch(url)
    const text = await res.text()
    if (!res.ok) {
      const msg = text || `Request failed (${res.status})`
      throw new Error(msg)
    }
    return text ? JSON.parse(text) : {}
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid response from server')
    }
    throw err
  }
}

/**
 * GET /reports/sales-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @param {{ from?: string, to?: string }} options - Optional date range (YYYY-MM-DD)
 * @returns {Promise<Array>} Parsed JSON response (array)
 * @throws {Error} On fetch failure or non-OK response
 */
export async function getSalesList({ from, to } = {}) {
  const query = buildQuery({ from, to })
  const url = `${API_BASE}/reports/sales-list${query}`
  try {
    const res = await fetch(url)
    const text = await res.text()
    if (!res.ok) {
      const msg = text || `Request failed (${res.status})`
      throw new Error(msg)
    }
    const data = text ? JSON.parse(text) : []
    return Array.isArray(data) ? data : []
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid response from server')
    }
    throw err
  }
}

/**
 * GET /reports/sales-profit?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @param {{ from?: string, to?: string }} options - Optional date range (YYYY-MM-DD)
 * @returns {Promise<{ sales: Array<{ saleId: string, billNumber: string, soldAt: string, profit: number }>, totalProfit?: number }>}
 * @throws {Error} On fetch failure or non-OK response
 */
export async function getSalesProfit({ from, to } = {}) {
  const query = buildQuery({ from, to })
  const url = `${API_BASE}/reports/sales-profit${query}`
  try {
    const res = await fetch(url)
    const text = await res.text()
    if (!res.ok) {
      const msg = text || `Request failed (${res.status})`
      throw new Error(msg)
    }
    const data = text ? JSON.parse(text) : null
    if (Array.isArray(data)) {
      const totalProfit = data.reduce((sum, row) => sum + (Number(row?.profit) || 0), 0)
      return { sales: data, totalProfit }
    }
    const sales = Array.isArray(data?.sales) ? data.sales : []
    const totalProfit = Number(data?.totalProfit)
    return { sales, totalProfit: Number.isFinite(totalProfit) ? totalProfit : undefined }
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid response from server')
    }
    throw err
  }
}

/**
 * GET /reports/inventory-valuation
 * @returns {Promise<unknown>} Parsed JSON response
 * @throws {Error} On fetch failure or non-OK response
 */
export async function getInventoryValuation() {
  const url = `${API_BASE}/reports/inventory-valuation`
  try {
    const res = await fetch(url)
    const text = await res.text()
    if (!res.ok) {
      const msg = text || `Request failed (${res.status})`
      throw new Error(msg)
    }
    return text ? JSON.parse(text) : null
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid response from server')
    }
    throw err
  }
}

/**
 * GET /reports/inventory-aging?asOf=YYYY-MM-DD&categoryId=...
 * @param {{ asOf?: string, categoryId?: string }} options - As-of date (YYYY-MM-DD), optional category
 * @returns {Promise<unknown>} Parsed JSON response (e.g. { items: [], summary: {} } or array)
 * @throws {Error} On fetch failure or non-OK response
 */
export async function getInventoryAging({ asOf, categoryId } = {}) {
  const query = buildQuery({ asOf, categoryId })
  const url = `${API_BASE}/reports/inventory-aging${query}`
  try {
    const res = await fetch(url)
    const text = await res.text()
    if (!res.ok) {
      const msg = text || `Request failed (${res.status})`
      throw new Error(msg)
    }
    return text ? JSON.parse(text) : null
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid response from server')
    }
    throw err
  }
}
