import { useState } from 'react'
import { getSalesProfit } from '../api/reports.api.js'
import './ProfitReportPage.css'

function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return isoString
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatProfit(profit) {
  const n = Number(profit)
  if (!Number.isFinite(n)) return '—'
  return `₹${n.toFixed(2)}`
}

function profitClass(profit) {
  const n = Number(profit)
  if (n > 0) return 'profit-report-page__profit--positive'
  if (n < 0) return 'profit-report-page__profit--negative'
  return 'profit-report-page__profit--zero'
}

function ProfitReportPage() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [totalProfit, setTotalProfit] = useState(0)


  const handleApply = async () => {
    setError(null)
    setLoading(true)
    try {
      const params = { from: fromDate || undefined, to: toDate || undefined }
      const result = await getSalesProfit(params)
      setData(Array.isArray(result?.sales) ? result.sales : [])
      setTotalProfit(Number(result?.totalProfit || 0))

    } catch (err) {
      setError(err?.message ?? 'Request failed')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profit-report-page">
      <h1 className="profit-report-page__title">Profit Report</h1>

      <section className="profit-report-page__section">
        <div className="profit-report-page__row">
          <label htmlFor="profit-from" className="profit-report-page__label">From</label>
          <input
            id="profit-from"
            type="date"
            className="profit-report-page__input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="From date"
          />
          <label htmlFor="profit-to" className="profit-report-page__label">To</label>
          <input
            id="profit-to"
            type="date"
            className="profit-report-page__input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="To date"
          />
          <button
            type="button"
            className="profit-report-page__btn profit-report-page__btn--primary"
            onClick={handleApply}
            disabled={loading}
          >
            Apply
          </button>
        </div>

        {loading && (
          <div className="profit-report-page__spinner-wrap" aria-live="polite">
            <span className="profit-report-page__spinner" aria-hidden="true" />
            <span>Loading…</span>
          </div>
        )}

        {error && (
          <p className="profit-report-page__error" role="alert">{error}</p>
        )}

        <div className="profit-report-page__table-section">
          <h2 className="profit-report-page__heading">Bill-wise profit</h2>
          {loading ? (
            <p className="profit-report-page__empty">Loading…</p>
          ) : (Array.isArray(data) ? data : []).length === 0 ? (
            <p className="profit-report-page__empty">No data for the selected range. Choose dates and click Apply.</p>
          ) : (
            <div className="profit-report-page__table-wrap">
              <table className="profit-report-page__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bill Number</th>
                    <th className="profit-report-page__th-num">Profit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(data) ? data : []).map((row, index) => (
                    <tr key={row?.saleId ?? `row-${index}`}>
                      <td>{formatDate(row?.soldAt)}</td>
                      <td>{row?.billNumber ?? '—'}</td>
                      <td className={`profit-report-page__cell-num ${profitClass(row?.profit)}`}>
                        {formatProfit(row?.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="profit-report-page__summary">
  Total Profit: <strong>₹{totalProfit.toFixed(2)}</strong>
</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default ProfitReportPage
