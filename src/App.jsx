import { Routes, Route } from 'react-router-dom'
import { ProductEntryPage, ProductListPage, ProfitReportPage, PurchaseEntryPage, ReportsPage, SalesPage, InventoryValuationPage, InventoryAgingReportPage } from './pages'
import './App.css'


function App() {
  return (
    <Routes>
      <Route path="/entry" element={<ProductEntryPage />} />
      <Route path="/purchase" element={<PurchaseEntryPage />} />
      <Route path="/products" element={<ProductListPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/reports/profit" element={<ProfitReportPage />} />
      <Route path="/reports/inventory-valuation" element={<InventoryValuationPage />} />
      <Route path="/reports/inventory-aging" element={<InventoryAgingReportPage />} />
      <Route path="/sales" element={<SalesPage />} />
    </Routes>
  )
}

export default App
