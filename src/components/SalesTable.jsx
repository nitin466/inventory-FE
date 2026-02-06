import { useState, Fragment } from 'react'
import './SalesTable.css'

function formatPaymentSummary(row) {
  const p = row.payments
  if (!p || typeof p !== 'object') return '—'
  const parts = Object.entries(p)
    .filter(([, amount]) => amount != null && Number(amount) !== 0)
    .map(([mode, amount]) => `${mode} ${Number(amount).toFixed(2)}`)
  return parts.length ? parts.join(', ') : '—'
}

function SalesTable({ sales }) {
  const [expandedIds, setExpandedIds] = useState(new Set())
  const list = Array.isArray(sales) ? sales : []
  const sorted = [...list].sort((a, b) => {
    const dateA = a.soldAt ? new Date(a.soldAt).getTime() : 0
    const dateB = b.soldAt ? new Date(b.soldAt).getTime() : 0
    return dateB - dateA
  })

  const toggleExpanded = (saleId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(saleId)) next.delete(saleId)
      else next.add(saleId)
      return next
    })
  }

  if (sorted.length === 0) {
    return (
      <div className="sales-table__empty">No sales data</div>
    )
  }

  return (
    <div className="sales-table__wrap">
      <table className="sales-table">
        <thead>
          <tr>
            <th className="sales-table__th-expand" aria-label="Expand row" />
            <th>Date/Time</th>
            <th>Bill number</th>
            <th>Items</th>
            <th>Amount</th>
            <th>Payment summary</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => {
            const id = row.saleId ?? row.id ?? index
            const isExpanded = expandedIds.has(id)
            const items = Array.isArray(row.items) ? row.items : []
            return (
              <Fragment key={id}>
                <tr
                  key={id}
                  className="sales-table__row"
                  onClick={() => toggleExpanded(id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleExpanded(id)}
                  aria-expanded={isExpanded}
                >
                  <td className="sales-table__cell-expand">
                    <span className="sales-table__chevron" aria-hidden="true">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </td>
                  <td>
                    {row.soldAt
                      ? new Date(row.soldAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>{row.billNumber ?? '—'}</td>
                  <td className="sales-table__cell-num">{row.totalItems != null ? row.totalItems : '—'}</td>
                  <td className="sales-table__cell-num">
                    {row.totalAmount != null
                      ? Number(row.totalAmount).toFixed(2)
                      : '—'}
                  </td>
                  <td className="sales-table__payment-summary">{formatPaymentSummary(row)}</td>
                </tr>
                {isExpanded && items.length > 0 && (
                  <tr key={`${id}-exp`} className="sales-table__expanded-row">
                    <td colSpan={6} className="sales-table__expanded-cell">
                      <div className="sales-table__items-wrap">
                        <table className="sales-table__items-table">
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Name</th>
                              <th>Qty</th>
                              <th>Unit price</th>
                              <th>Line total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, i) => (
                              <tr key={item.id ?? i}>
                                <td>{item.sku ?? '—'}</td>
                                <td>{item.name ?? item.sku ?? '—'}</td>
                                <td className="sales-table__cell-num">{item.quantity ?? '—'}</td>
                                <td className="sales-table__cell-num">
                                  {item.unitPrice != null ? Number(item.unitPrice).toFixed(2) : '—'}
                                </td>
                                <td className="sales-table__cell-num">
                                  {item.lineTotal != null ? Number(item.lineTotal).toFixed(2) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default SalesTable
