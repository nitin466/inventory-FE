import { useState, useCallback, useMemo, useRef } from 'react'
import { getDiscountPercentage } from '../utils/discount.js'
import { CameraScanModal } from '../components'
import './SalesPage.css'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const PAYMENT_MODES = ['CASH', 'UPI', 'CARD']
const UPI_PROVIDERS = ['PhonePe', 'GPay', 'Paytm', 'Other']

function SalesPage() {
  const [skuInput, setSkuInput] = useState('')
  const [scannedProduct, setScannedProduct] = useState(null) // { sku, productId, name, attributes, mrp, defaultPrice, maxDiscount, stock, bargainPrice, quantity }
  const [cartItems, setCartItems] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const skuInputRef = useRef(null)

  /* Cart total: derived only from cartItems (lineTotal). Payments validate against this. */
  const totalBill = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0),
    [cartItems]
  )
  const paidAmount = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments]
  )
  const remainingAmount = useMemo(
    () => Math.max(0, totalBill - paidAmount),
    [totalBill, paidAmount]
  )
  const isFullyPaid = totalBill > 0 && remainingAmount < 0.01

  const fetchBySku = useCallback(async (skuOverride) => {
    const sku = (skuOverride != null ? String(skuOverride).trim() : skuInput.trim())
    if (!sku) return
    setError(null)
    setScannedProduct(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/products/by-sku/${encodeURIComponent(sku)}`)
      if (!res.ok) {
        setScannedProduct(null)
        if (res.status === 404) {
          setError('Product not found')
          return
        }
        const text = await res.text()
        setError(text || `Failed to load product (${res.status})`)
        return
      }
      const product = await res.json()
      const variant = product.productVariant ?? {}
      const defaultPrice = Number(variant.default_selling_price) || Number(product.default_selling_price) || 0
      setScannedProduct({
        sku: product.sku,
        productId: product.id,
        name: product.name ?? product.sku,
        attributes: variant.attributes_json != null && typeof variant.attributes_json === 'object'
          ? { ...variant.attributes_json }
          : {},
        mrp: variant.mrp != null ? Number(variant.mrp) : undefined,
        defaultPrice,
        maxDiscount: variant.max_discount_percent != null ? Number(variant.max_discount_percent) : undefined,
        stock: product.quantityInStock != null ? Number(product.quantityInStock) : undefined,
        bargainPrice: defaultPrice,
        quantity: 1,
      })
      if (skuOverride == null) setSkuInput('')
    } finally {
      setLoading(false)
    }
  }, [skuInput])

  const handleScanOrFetch = () => void fetchBySku()

  const handleCameraScan = useCallback((decodedText) => {
    setSkuInput(decodedText)
    setIsCameraOpen(false)
    fetchBySku(decodedText)
  }, [fetchBySku])

  const previewDiscountPercent = useMemo(() => {
    if (!scannedProduct?.mrp) return null
    return getDiscountPercentage(scannedProduct.mrp, scannedProduct.bargainPrice ?? scannedProduct.defaultPrice ?? 0)
  }, [scannedProduct])
  const previewDiscountExceedsMax =
    scannedProduct?.maxDiscount != null &&
    previewDiscountPercent != null &&
    previewDiscountPercent > scannedProduct.maxDiscount

  const setScannedBargainPrice = useCallback((value) => {
    setScannedProduct((prev) => {
      if (!prev) return null
      const num = value === '' ? prev.defaultPrice : Number(value)
      return { ...prev, bargainPrice: num }
    })
  }, [])

  const setScannedQuantity = useCallback((value) => {
    setScannedProduct((prev) => {
      if (!prev) return null
      const raw = typeof value === 'number' ? value : Number(value)
      const maxQty = prev.stock != null && prev.stock >= 0 ? prev.stock : undefined
      let qty = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
      if (maxQty != null && qty > maxQty) qty = maxQty
      return { ...prev, quantity: qty }
    })
  }, [])

  const previewLineTotal = useMemo(() => {
    if (!scannedProduct) return null
    const qty = Math.max(0, Math.floor(Number(scannedProduct.quantity) || 1))
    const price = Number(scannedProduct.bargainPrice) ?? Number(scannedProduct.defaultPrice) ?? 0
    return qty * price
  }, [scannedProduct])

  const addScannedToCart = useCallback(() => {
    if (!scannedProduct) return
    const sku = scannedProduct.sku
    const productId = scannedProduct.productId
    const sellingPrice = Number(scannedProduct.bargainPrice) ?? Number(scannedProduct.defaultPrice) ?? 0
    const mrp = scannedProduct.mrp
    const maxDiscount = scannedProduct.maxDiscount
    const addQty = Math.max(1, Math.floor(Number(scannedProduct.quantity) || 1))
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.sku === sku)
      if (existingIndex >= 0) {
        const next = [...prev]
        const item = next[existingIndex]
        const quantity = (item.quantity ?? 1) + addQty
        const lineTotal = quantity * (Number(item.sellingPrice) || 0)
        next[existingIndex] = { ...item, quantity, lineTotal }
        return next
      }
      return [
        ...prev,
        {
          sku,
          productId,
          quantity: addQty,
          sellingPrice,
          mrp,
          maxDiscount,
          lineTotal: addQty * sellingPrice,
        },
      ]
    })
    setScannedProduct(null)
    setSkuInput('')
    skuInputRef.current?.focus()
  }, [scannedProduct])

  const scannedQty = Math.max(1, Math.floor(Number(scannedProduct?.quantity) || 1))
  const maxQty = scannedProduct?.stock != null && scannedProduct.stock >= 0 ? scannedProduct.stock : undefined
  const addToCartDisabled =
    !scannedProduct ||
    (scannedProduct.stock != null && scannedProduct.stock <= 0) ||
    (maxQty != null && scannedQty > maxQty) ||
    scannedQty < 1 ||
    previewDiscountExceedsMax

  const handleAddPayment = () => {
    setPayments((prev) => [...prev, { mode: 'CASH', provider: '', amount: '' }])
  }

  const handlePaymentChange = (index, field, value) => {
    setPayments((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemovePayment = (index) => {
    setPayments((prev) => prev.filter((_, i) => i !== index))
  }

  /* Confirm Sale: payload built only from cartItems and payments; no scannedProduct. */
  const confirmSale = useCallback(async () => {
    setError(null)
    setSuccessMessage(null)
    setLoading(true)
    try {
      const items = cartItems.map((item) => ({
        sku: item.sku,
        quantity: item.quantity ?? 1,
        sellingPrice: Number(item.sellingPrice) || 0,
      }))
      const payload = {
        items,
        payments: payments.map((p) => ({
          mode: p.mode ?? 'CASH',
          provider: p.mode === 'UPI' ? (p.provider ?? '') : undefined,
          amount: Number(p.amount) || 0,
        })),
      }
      const res = await fetch(`${API_BASE}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        setError(text || `Sale failed (${res.status})`)
        return
      }
      setSuccessMessage('Sale confirmed successfully.')
      setScannedProduct(null)
      setCartItems([])
      setPayments([])
      skuInputRef.current?.focus()
    } catch (err) {
      setError(err?.message ?? 'Sale failed')
    } finally {
      setLoading(false)
    }
  }, [cartItems, payments])

  const handleConfirmSale = () => void confirmSale()

  return (
    <div className="sales-page">
      <h1 className="sales-page__title">Sales</h1>

      {error && (
        <p className="sales-page__error" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="sales-page__success" role="status">
          {successMessage}
        </p>
      )}

      <section className="sales-page__section">
        <h2 className="sales-page__heading">Add item</h2>
        <div className="sales-page__row">
          <input
            ref={skuInputRef}
            type="text"
            className="sales-page__input"
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleScanOrFetch())}
            placeholder="Scan or enter SKU"
            aria-label="SKU"
          />
          <button
            type="button"
            className="sales-page__btn sales-page__btn--primary"
            onClick={handleScanOrFetch}
            disabled={loading}
          >
            {loading ? 'Scanning…' : 'Scan'}
          </button>
          <button
            type="button"
            className="sales-page__btn sales-page__btn--secondary"
            onClick={() => setIsCameraOpen(true)}
            disabled={loading || isCameraOpen}
            aria-label="Open camera to scan barcode"
          >
            Scan 📷
          </button>
        </div>
      </section>

      <CameraScanModal
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={handleCameraScan}
      />

      {scannedProduct && (
        <section className="sales-page__section sales-page__preview" aria-labelledby="sales-preview-heading">
          <h2 id="sales-preview-heading" className="sales-page__heading">Product Preview</h2>
          <div className="sales-page__preview-body">
            <p className="sales-page__preview-name">
              {scannedProduct.name || scannedProduct.sku}
            </p>
            {Object.keys(scannedProduct.attributes || {}).length > 0 && (
              <dl className="sales-page__preview-attributes">
                {Object.entries(scannedProduct.attributes).map(([key, value]) => (
                  <div key={key} className="sales-page__preview-attr">
                    <dt className="sales-page__preview-attr-label">{key}</dt>
                    <dd className="sales-page__preview-attr-value">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="sales-page__preview-row">
              <span className="sales-page__preview-label">MRP</span>
              <span className="sales-page__preview-value">{scannedProduct.mrp != null ? scannedProduct.mrp.toFixed(2) : '—'}</span>
            </div>
            <div className="sales-page__preview-row">
              <span className="sales-page__preview-label">Default selling price</span>
              <span className="sales-page__preview-value">{scannedProduct.defaultPrice != null ? scannedProduct.defaultPrice.toFixed(2) : '—'}</span>
            </div>
            <div className="sales-page__preview-row">
              <span className="sales-page__preview-label">Stock available</span>
              <span className="sales-page__preview-value">{scannedProduct.stock != null ? scannedProduct.stock : '—'}</span>
            </div>
            <div className="sales-page__preview-row sales-page__preview-row--quantity">
              <label htmlFor="sales-quantity" className="sales-page__preview-label">Quantity</label>
              <div className="sales-page__quantity-stepper">
                <button
                  type="button"
                  className="sales-page__stepper-btn"
                  onClick={() => setScannedQuantity(scannedQty - 1)}
                  disabled={scannedQty <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input
                  id="sales-quantity"
                  type="number"
                  min={1}
                  max={maxQty ?? undefined}
                  step={1}
                  className="sales-page__input sales-page__input--quantity"
                  value={scannedQty}
                  onChange={(e) => setScannedQuantity(e.target.value)}
                  aria-label="Quantity"
                />
                <button
                  type="button"
                  className="sales-page__stepper-btn"
                  onClick={() => setScannedQuantity(scannedQty + 1)}
                  disabled={maxQty != null && scannedQty >= maxQty}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
            <div className="sales-page__preview-row">
              <label htmlFor="sales-bargain-price" className="sales-page__preview-label">Bargain Price</label>
              <input
                id="sales-bargain-price"
                type="number"
                step="any"
                min="0"
                className="sales-page__input sales-page__input--bargain"
                value={typeof scannedProduct.bargainPrice === 'number' ? scannedProduct.bargainPrice : (scannedProduct.defaultPrice ?? '')}
                onChange={(e) => setScannedBargainPrice(e.target.value)}
                aria-label="Bargain price"
              />
            </div>
            <div className="sales-page__preview-row">
              <span className="sales-page__preview-label">Discount</span>
              <span
                className={`sales-page__preview-discount ${previewDiscountExceedsMax ? 'sales-page__preview-discount--exceeded' : ''}`}
                role="status"
              >
                {previewDiscountPercent != null ? `${previewDiscountPercent.toFixed(2)}%` : '—'}
              </span>
            </div>
            {previewDiscountExceedsMax && (
              <p className="sales-page__preview-warning" role="alert">
                Discount exceeds allowed limit
              </p>
            )}
            <div className="sales-page__preview-row">
              <span className="sales-page__preview-label">Line total</span>
              <span className="sales-page__preview-value">
                {previewLineTotal != null ? previewLineTotal.toFixed(2) : '—'}
              </span>
            </div>
            <button
              type="button"
              className="sales-page__btn sales-page__btn--primary"
              onClick={addScannedToCart}
              disabled={addToCartDisabled}
              aria-label="Add to cart"
            >
              Add to Cart
            </button>
          </div>
        </section>
      )}

      {/* Cart: reads only cartItems state (sku, quantity, sellingPrice, lineTotal). */}
      <section className="sales-page__section">
        <h2 className="sales-page__heading">Cart</h2>
        <div className="sales-page__table-wrap">
          <table className="sales-page__table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="sales-page__empty">
                    No items in cart
                  </td>
                </tr>
              ) : (
                cartItems.map((item, index) => (
                  <tr key={`${item.sku}-${index}`}>
                    <td>{item.sku}</td>
                    <td>{item.quantity ?? 1}</td>
                    <td>{item.sellingPrice != null ? item.sellingPrice : '—'}</td>
                    <td>{item.lineTotal != null ? item.lineTotal : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sales-page__section">
        <h2 className="sales-page__heading">Payments</h2>
        <div className="sales-page__totals">
          <div className="sales-page__total-row">
            <span className="sales-page__total-label">Total Bill</span>
            <span className="sales-page__total-value">{totalBill.toFixed(2)}</span>
          </div>
          <div className="sales-page__total-row">
            <span className="sales-page__total-label">Paid Amount</span>
            <span className="sales-page__total-value">{paidAmount.toFixed(2)}</span>
          </div>
          <div className="sales-page__total-row">
            <span className="sales-page__total-label">Remaining Amount</span>
            <span className="sales-page__total-value">{remainingAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="sales-page__payment-rows">
          {payments.map((p, index) => (
            <div key={index} className="sales-page__payment-row">
              <select
                className="sales-page__select"
                value={p.mode ?? 'CASH'}
                onChange={(e) => handlePaymentChange(index, 'mode', e.target.value)}
                aria-label="Payment mode"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {p.mode === 'UPI' && (
                <select
                  className="sales-page__select"
                  value={p.provider ?? ''}
                  onChange={(e) => handlePaymentChange(index, 'provider', e.target.value)}
                  aria-label="UPI provider"
                >
                  <option value="">Select provider</option>
                  {UPI_PROVIDERS.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              )}
              <input
                type="number"
                step="any"
                min="0"
                className="sales-page__input sales-page__input--amount"
                value={p.amount === '' || p.amount == null ? '' : p.amount}
                onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                placeholder="Amount"
                aria-label="Amount"
              />
              <button
                type="button"
                className="sales-page__btn sales-page__btn--remove"
                onClick={() => handleRemovePayment(index)}
                aria-label="Remove payment"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="sales-page__btn sales-page__btn--secondary"
          onClick={handleAddPayment}
        >
          Add Payment
        </button>
      </section>

      <div className="sales-page__actions">
        <button
          type="button"
          className="sales-page__btn sales-page__btn--primary sales-page__btn--confirm"
          onClick={handleConfirmSale}
          disabled={loading || cartItems.length === 0 || !isFullyPaid}
        >
          {loading ? 'Processing…' : 'Confirm Sale'}
        </button>
      </div>
    </div>
  )
}

export default SalesPage
