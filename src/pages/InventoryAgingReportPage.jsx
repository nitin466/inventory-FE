import { useState, useEffect } from 'react'
import { getInventoryAging } from '../api/reports.api.js'
import './InventoryAgingReportPage.css'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const BUCKET_0_30 = '0_30'
const BUCKET_31_60 = '31_60'
const BUCKET_61_90 = '61_90'
const BUCKET_90_PLUS = '90_plus'

const BUCKETS = [
  { key: BUCKET_0_30, label: '0–30 days' },
  { key: BUCKET_31_60, label: '31–60 days' },
  { key: BUCKET_61_90, label: '61–90 days' },
  { key: BUCKET_90_PLUS, label: '90+ days' },
]

function formatRupee(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '—'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDiscountPercent(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '—'
  return `${num.toFixed(0)}%`
}

function getBucketKey(row) {
  const b = row?.bucket
  if (typeof b === 'string') {
    if (b === '0-30' || b === '0–30') return BUCKET_0_30
    if (b === '31-60' || b === '31–60') return BUCKET_31_60
    if (b === '61-90' || b === '61–90') return BUCKET_61_90
    if (b === '90+' || b === '90+ days') return BUCKET_90_PLUS
  }
  const age = Number(row?.ageDays)
  if (!Number.isFinite(age)) return null
  if (age <= 30) return BUCKET_0_30
  if (age <= 60) return BUCKET_31_60
  if (age <= 90) return BUCKET_61_90
  return BUCKET_90_PLUS
}

function deriveSummaryFromItems(items) {
  const summary = { [BUCKET_0_30]: 0, [BUCKET_31_60]: 0, [BUCKET_61_90]: 0, [BUCKET_90_PLUS]: 0 }
  const list = Array.isArray(items) ? items : []
  for (const row of list) {
    const key = getBucketKey(row)
    if (!key) continue
    const val = Number(row?.value ?? row?.inventoryValue ?? row?.quantity ?? 0) || 0
    summary[key] = (summary[key] ?? 0) + val
  }
  return summary
}

function InventoryAgingReportPage() {
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState([])
  const [data, setData] = useState([])
  const [summary, setSummary] = useState({
    [BUCKET_0_30]: 0,
    [BUCKET_31_60]: 0,
    [BUCKET_61_90]: 0,
    [BUCKET_90_PLUS]: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/config/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then((raw) => {
        if (cancelled) return
        const list = Array.isArray(raw) ? raw : raw?.data ?? raw?.categories ?? []
        setCategories(list.map((c) => ({ id: c.id, name: c.name ?? c.label ?? c.id })))
      })
      .catch(() => { if (!cancelled) setCategories([]) })
    return () => { cancelled = true }
  }, [])

  const loadReport = () => {
    setError(null)
    setLoading(true)
    const params = { asOf: asOfDate || undefined, categoryId: categoryId || undefined }
    getInventoryAging(params)
      .then((raw) => {
        const items = Array.isArray(raw) ? raw : raw?.items ?? raw?.rows ?? []
        setData(Array.isArray(items) ? items : [])
        const sum = raw?.summary && typeof raw.summary === 'object'
          ? {
              [BUCKET_0_30]: Number(raw.summary.bucket0_30 ?? raw.summary[BUCKET_0_30] ?? 0),
              [BUCKET_31_60]: Number(raw.summary.bucket31_60 ?? raw.summary[BUCKET_31_60] ?? 0),
              [BUCKET_61_90]: Number(raw.summary.bucket61_90 ?? raw.summary[BUCKET_61_90] ?? 0),
              [BUCKET_90_PLUS]: Number(raw.summary.bucket90_plus ?? raw.summary[BUCKET_90_PLUS] ?? 0),
            }
          : deriveSummaryFromItems(items)
        setSummary(sum)
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load report')
        setData([])
        setSummary({
          [BUCKET_0_30]: 0,
          [BUCKET_31_60]: 0,
          [BUCKET_61_90]: 0,
          [BUCKET_90_PLUS]: 0,
        })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadReport()
  }, [])

  const handleApply = (e) => {
    e?.preventDefault?.()
    loadReport()
  }

  const isEmpty = !loading && !error && data.length === 0

  return (
    <div className="inventory-aging-page">
      <h1 className="inventory-aging-page__title">Inventory Aging</h1>

      <section className="inventory-aging-page__section">
        <form className="inventory-aging-page__row" onSubmit={handleApply}>
          <label htmlFor="inventory-aging-asof" className="inventory-aging-page__label">As-of date</label>
          <input
            id="inventory-aging-asof"
            type="date"
            className="inventory-aging-page__input"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            aria-label="As-of date"
          />
          <label htmlFor="inventory-aging-category" className="inventory-aging-page__label">Category</label>
          <select
            id="inventory-aging-category"
            className="inventory-aging-page__input inventory-aging-page__select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="inventory-aging-page__btn inventory-aging-page__btn--primary"
            disabled={loading}
          >
            Apply
          </button>
        </form>

        {loading && (
          <div className="inventory-aging-page__loading" aria-live="polite">
            <span className="inventory-aging-page__spinner" aria-hidden="true" />
            <span>Loading…</span>
          </div>
        )}

        {error && (
          <p className="inventory-aging-page__error" role="alert">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="inventory-aging-page__cards">
              {BUCKETS.map(({ key, label }) => (
                <div key={key} className="inventory-aging-page__card">
                  <span className="inventory-aging-page__card-label">{label}</span>
                  <span className="inventory-aging-page__card-value">
                    {formatRupee(summary[key] ?? 0)}
                  </span>
                </div>
              ))}
            </div>

            <div className="inventory-aging-page__table-section">
              <h2 className="inventory-aging-page__heading">Aging detail</h2>
              {isEmpty ? (
                <p className="inventory-aging-page__empty">
                  No inventory aging data for the selected filters.
                </p>
              ) : (
                <div className="inventory-aging-page__table-wrap">
                  <table className="inventory-aging-page__table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th className="inventory-aging-page__th-num">Age (days)</th>
                        <th>Bucket</th>
                        <th className="inventory-aging-page__th-num">Quantity</th>
                        <th className="inventory-aging-page__th-num">Value (₹)</th>
                        <th className="inventory-aging-page__th-num">Suggested Discount</th>
                        <th className="inventory-aging-page__th-num">Suggested Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(data) ? data : []).map((row, index) => {
                        const discountPct = Number(row?.suggestedDiscountPercent)
                        const hasDiscount = Number.isFinite(discountPct) && discountPct > 0
                        const capped = Boolean(row?.discountCappedByCost)
                        return (
                          <tr key={row?.sku ?? row?.productVariantId ?? `row-${index}`}>
                            <td>{row?.sku ?? '—'}</td>
                            <td>{row?.productName ?? row?.name ?? '—'}</td>
                            <td className="inventory-aging-page__cell-num">{row?.ageDays ?? '—'}</td>
                            <td>{row?.bucket ?? '—'}</td>
                            <td className="inventory-aging-page__cell-num">{row?.quantity ?? '—'}</td>
                            <td className="inventory-aging-page__cell-num">
                              {formatRupee(row?.value ?? row?.inventoryValue)}
                            </td>
                            <td className="inventory-aging-page__cell-num">
                              <span
                                className={`inventory-aging-page__badge ${hasDiscount ? 'inventory-aging-page__badge--highlighted' : 'inventory-aging-page__badge--muted'}`}
                                aria-label={formatDiscountPercent(row?.suggestedDiscountPercent)}
                              >
                                {formatDiscountPercent(row?.suggestedDiscountPercent)}
                              </span>
                            </td>
                            <td className="inventory-aging-page__cell-num inventory-aging-page__suggested-price-cell">
                              <span className="inventory-aging-page__suggested-price">
                                {formatRupee(row?.suggestedPrice)}
                              </span>
                              {capped && (
                                <span
                                  className="inventory-aging-page__capped-warning"
                                  title="Discount limited to avoid loss"
                                  aria-label="Discount limited to avoid loss"
                                  role="img"
                                >
                                  ⚠
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default InventoryAgingReportPage
