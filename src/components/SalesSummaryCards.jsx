import './SalesSummaryCards.css'

const PAYMENT_MODES = ['CASH', 'CARD', 'UPI', 'UPI_N', 'UPI_']

function SalesSummaryCards({ summary }) {
  if (summary == null || typeof summary !== 'object') return null

  const totalBills = summary.totalBills ?? 0
  const totalItems = summary.totalItems ?? 0
  const totalRevenue = summary.totalRevenue != null ? Number(summary.totalRevenue) : 0
  const payments = summary.payments && typeof summary.payments === 'object' ? summary.payments : {}

  const allModes = [...new Set([...PAYMENT_MODES, ...Object.keys(payments)])]
  const paymentEntries = allModes.map((mode) => [mode, Number(payments[mode]) || 0])

  return (
    <div className="sales-summary-cards">
      <div className="sales-summary-cards__grid">
        <div className="sales-summary-cards__card">
          <span className="sales-summary-cards__card-label">Total Bills</span>
          <span className="sales-summary-cards__card-value">{totalBills}</span>
        </div>
        <div className="sales-summary-cards__card">
          <span className="sales-summary-cards__card-label">Total Items</span>
          <span className="sales-summary-cards__card-value">{totalItems}</span>
        </div>
        <div className="sales-summary-cards__card">
          <span className="sales-summary-cards__card-label">Total Revenue</span>
          <span className="sales-summary-cards__card-value">
            {totalRevenue.toFixed(2)}
          </span>
        </div>
      </div>

      {paymentEntries.length > 0 && (
        <div className="sales-summary-cards__payments">
          <table className="sales-summary-cards__table">
            <thead>
              <tr>
                <th>Mode</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {paymentEntries.map(([mode, amount]) => (
                <tr key={mode}>
                  <td>{mode}</td>
                  <td>{amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SalesSummaryCards
