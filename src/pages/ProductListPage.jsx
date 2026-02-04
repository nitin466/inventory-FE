import { useState, useEffect } from 'react'
import { db } from '../db'

function ProductListPage() {
  const [products, setProducts] = useState([])
  const [variantByProductId, setVariantByProductId] = useState({})

  useEffect(() => {
    let cancelled = false
    Promise.all([db.products.toArray(), db.product_variants.toArray()]).then(
      ([productList, variantList]) => {
        if (cancelled) return
        setProducts(productList)
        const map = {}
        variantList.forEach((v) => {
          if (v.product_id != null) map[v.product_id] = v.id
        })
        setVariantByProductId(map)
      }
    )
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <h1>Product List</h1>
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Status</th>
            <th>Purchase price</th>
            <th>Variant ID</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.sku}</td>
              <td>{p.status}</td>
              <td>{p.purchasePrice != null ? p.purchasePrice : '-'}</td>
              <td>{variantByProductId[p.id] ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ProductListPage
