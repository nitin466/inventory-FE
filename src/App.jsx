import { Routes, Route } from 'react-router-dom'
import { ProductEntryPage, ProductListPage } from './pages'
import './App.css'


function App() {
  return (
    <Routes>
      <Route path="/entry" element={<ProductEntryPage />} />
      <Route path="/products" element={<ProductListPage />} />
    </Routes>
  )
}

export default App
