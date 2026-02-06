import { useState } from 'react'
import { getSalesSummary, getSalesList } from '../api/reports.api.js'
import { SalesSummaryCards, SalesTable } from '../components'
import './ReportsPage.css'

function ReportsPage() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [summary, setSummary] = useState(null)
  const [salesList, setSalesList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleApply = async () => {
    setError(null)
    setLoading(true)
    try {
      const params = { from: fromDate || undefined, to: toDate || undefined }
      const [summaryData, listData] = await Promise.all([
        getSalesSummary(params),
        getSalesList(params),
      ])
      setSummary(summaryData)
      setSalesList(Array.isArray(listData) ? listData : [])
    } catch (err) {
      setError(err?.message ?? 'Request failed')
      setSummary(null)
      setSalesList([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reports-page">
      <h1 className="reports-page__title">Reports</h1>

      <section className="reports-page__section">
        <div className="reports-page__row">
          <label htmlFor="reports-from" className="reports-page__label">From</label>
          <input
            id="reports-from"
            type="date"
            className="reports-page__input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="From date"
          />
          <label htmlFor="reports-to" className="reports-page__label">To</label>
          <input
            id="reports-to"
            type="date"
            className="reports-page__input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="To date"
          />
          <button
            type="button"
            className="reports-page__btn reports-page__btn--primary"
            onClick={handleApply}
            disabled={loading}
          >
            Apply
          </button>
        </div>

        {loading && (
          <div className="reports-page__spinner-wrap" aria-live="polite">
            <span className="reports-page__spinner" aria-hidden="true" />
            <span>Loading…</span>
          </div>
        )}

        {error && (
          <p className="reports-page__error" role="alert">{error}</p>
        )}

        {!loading && summary != null && (
          <div className="reports-page__summary">
            <h2 className="reports-page__heading">Summary</h2>
            <SalesSummaryCards summary={summary} />
          </div>
        )}

        {!loading && (
          <div className="reports-page__table-section">
            <h2 className="reports-page__heading">Sales List</h2>
            <SalesTable sales={salesList} />
          </div>
        )}
      </section>
    </div>
  )
}

export default ReportsPage
