import { useState, useEffect } from 'react'
import { getInventoryValuation } from '../api/reports.api.js'
import './InventoryValuationPage.css'

function formatRupee(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '—'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatAttributes(attributes) {
  if (attributes == null || typeof attributes !== 'object') return '—'
  const entries = Object.entries(attributes)
  if (entries.length === 0) return '—'
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
}

function InventoryValuationPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getInventoryValuation()
      .then((raw) => {
        if (cancelled) return
        const list = Array.isArray(raw) ? raw : raw?.items ?? raw?.rows ?? []
        setData(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load inventory valuation')
          setData([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const totalValue = data.reduce((sum, row) => sum + (Number(row?.inventoryValue) || 0), 0)
  const isEmpty = !loading && !error && data.length === 0

  return (
    <div className="inventory-valuation-page">
      <h1 className="inventory-valuation-page__title">Inventory Valuation</h1>
      <p className="inventory-valuation-page__subtitle">
        Cost-based valuation: stock × average purchase cost. Values are computed dynamically and not stored.
      </p>

      {loading && (
        <div className="inventory-valuation-page__loading" aria-live="polite">
          <span className="inventory-valuation-page__spinner" aria-hidden="true" />
          <span>Loading…</span>
        </div>
      )}

      {error && (
        <p className="inventory-valuation-page__error" role="alert">{error}</p>
      )}

      {!loading && !error && (
        <>
          <div className="inventory-valuation-page__summary">
            <strong>Total Inventory Value:</strong> {formatRupee(totalValue)}
          </div>

          {isEmpty ? (
            <p className="inventory-valuation-page__empty">
              No inventory with stock to value. Add products and purchases to see valuation.
            </p>
          ) : (
            <div className="inventory-valuation-page__table-wrap">
              <table className="inventory-valuation-page__table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Attributes</th>
                    <th className="inventory-valuation-page__th-num">Stock Qty</th>
                    <th className="inventory-valuation-page__th-num">Avg Cost (₹)</th>
                    <th className="inventory-valuation-page__th-num">Inventory Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={row?.productVariantId ?? `row-${index}`}>
                      <td>{row?.sku ?? '—'}</td>
                      <td>{row?.categoryName ?? '—'}</td>
                      <td className="inventory-valuation-page__attrs">
                        {formatAttributes(row?.attributes)}
                      </td>
                      <td className="inventory-valuation-page__cell-num">{row?.stockQty ?? '—'}</td>
                      <td className="inventory-valuation-page__cell-num">
                        {formatRupee(row?.avgCost)}
                      </td>
                      <td className="inventory-valuation-page__cell-num">
                        {formatRupee(row?.inventoryValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default InventoryValuationPage
