import { useState, useMemo, useEffect } from 'react'
import './PurchaseEntryPage.css'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const newItem = () => ({
  id: crypto.randomUUID(),
  productVariantId: '',
  quantity: 1,
  unitCost: '',
})

function PurchaseEntryPage() {
  const [supplierId, setSupplierId] = useState('')
  const [purchasedAt, setPurchasedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [invoiceNo, setInvoiceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [extraCharges, setExtraCharges] = useState('')
  const [items, setItems] = useState([newItem()])
  const [variantOptions, setVariantOptions] = useState([])
  const [supplierOptions, setSupplierOptions] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/config/product-variants`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.data ?? data?.variants ?? []
        setVariantOptions(list.map((v) => ({ id: v.id, label: v.label ?? v.sku ?? v.id })))
      })
      .catch(() => { if (!cancelled) setVariantOptions([]) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/config/suppliers`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.data ?? data?.suppliers ?? []
        setSupplierOptions(list.map((s) => ({ id: s.id, label: s.code ? `${s.name} (${s.code})` : s.name })))
      })
      .catch(() => { if (!cancelled) setSupplierOptions([]) })
    return () => { cancelled = true }
  }, [])

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addItem = () => setItems((prev) => [...prev, newItem()])
  const removeItem = (index) =>
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))

  const totalQuantity = useMemo(
    () => items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0),
    [items]
  )
  const baseCost = useMemo(
    () =>
      items.reduce((sum, row) => {
        const qty = Number(row.quantity) || 0
        const cost = Number(row.unitCost) || 0
        return sum + qty * cost
      }, 0),
    [items]
  )
  const extra = Number(extraCharges) || 0
  const finalCost = baseCost + extra

  const resetForm = () => {
    setSupplierId('')
    setPurchasedAt(new Date().toISOString().slice(0, 16))
    setInvoiceNo('')
    setNotes('')
    setExtraCharges('')
    setItems([newItem()])
  }

  const handleSave = async () => {
    const body = {
      supplierId: supplierId || null,
      purchasedAt: purchasedAt || null,
      invoiceNo: invoiceNo || null,
      notes: notes || null,
      extraCharges: extra,
      items: items.map(({ productVariantId, quantity, unitCost }) => ({
        productVariantId: productVariantId || null,
        quantity: Number(quantity) || 0,
        unitCost: Number(unitCost) || 0,
      })),
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.message || data?.error || `Save failed (${res.status})`)
        return
      }
      alert('Purchase saved successfully')
      resetForm()
    } catch (e) {
      alert(e?.message || 'Failed to save purchase')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="purchase-entry">
      <h1 className="purchase-entry__title">Purchase Entry</h1>

      <section className="purchase-entry__section">
        <h2 className="purchase-entry__heading">Details</h2>
        <div className="purchase-entry__row">
          <div className="purchase-entry__field">
            <label className="purchase-entry__label" htmlFor="purchase-supplier">Supplier</label>
            <select
              id="purchase-supplier"
              className="purchase-entry__input purchase-entry__select"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              aria-label="Supplier"
            >
              <option value="">Select supplier</option>
              {supplierOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="purchase-entry__field">
            <label className="purchase-entry__label" htmlFor="purchase-date">Date & time</label>
            <input
              id="purchase-date"
              type="datetime-local"
              className="purchase-entry__input"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
            />
          </div>
          <div className="purchase-entry__field">
            <label className="purchase-entry__label" htmlFor="purchase-invoice">Invoice no.</label>
            <input
              id="purchase-invoice"
              type="text"
              className="purchase-entry__input"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Invoice number"
            />
          </div>
        </div>
        <div className="purchase-entry__row">
          <div className="purchase-entry__field purchase-entry__field--wide">
            <label className="purchase-entry__label" htmlFor="purchase-notes">Notes</label>
            <input
              id="purchase-notes"
              type="text"
              className="purchase-entry__input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
            />
          </div>
          <div className="purchase-entry__field">
            <label className="purchase-entry__label" htmlFor="purchase-extra">Extra charges</label>
            <input
              id="purchase-extra"
              type="number"
              step="any"
              min="0"
              className="purchase-entry__input"
              value={extraCharges}
              onChange={(e) => setExtraCharges(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </section>

      <section className="purchase-entry__section">
        <h2 className="purchase-entry__heading">Items</h2>
        <div className="purchase-entry__table-wrap">
          <table className="purchase-entry__table">
            <thead>
              <tr>
                <th>Product variant</th>
                <th>Qty</th>
                <th>Unit cost</th>
                <th>Line total</th>
                <th className="purchase-entry__th-action" />
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => {
                const qty = Number(row.quantity) || 0
                const cost = Number(row.unitCost) || 0
                const lineTotal = qty * cost
                return (
                  <tr key={row.id}>
                    <td>
                      <select
                        className="purchase-entry__select purchase-entry__select--cell"
                        value={row.productVariantId}
                        onChange={(e) => updateItem(index, 'productVariantId', e.target.value)}
                        aria-label="Product variant"
                      >
                        <option value="">Select variant</option>
                        {variantOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="purchase-entry__input purchase-entry__input--cell purchase-entry__input--num"
                        value={row.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        aria-label="Quantity"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="purchase-entry__input purchase-entry__input--cell purchase-entry__input--num"
                        value={row.unitCost}
                        onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
                        placeholder="0"
                        aria-label="Unit cost"
                      />
                    </td>
                    <td className="purchase-entry__cell-num">{lineTotal.toFixed(2)}</td>
                    <td className="purchase-entry__cell-action">
                      <button
                        type="button"
                        className="purchase-entry__btn purchase-entry__btn--remove"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        aria-label="Remove row"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="purchase-entry__btn purchase-entry__btn--secondary"
          onClick={addItem}
        >
          Add row
        </button>
      </section>

      <section className="purchase-entry__section purchase-entry__summary">
        <h2 className="purchase-entry__heading">Summary</h2>
        <div className="purchase-entry__summary-row">
          <span className="purchase-entry__summary-label">Total quantity</span>
          <span className="purchase-entry__summary-value">{totalQuantity}</span>
        </div>
        <div className="purchase-entry__summary-row">
          <span className="purchase-entry__summary-label">Base cost</span>
          <span className="purchase-entry__summary-value">{baseCost.toFixed(2)}</span>
        </div>
        <div className="purchase-entry__summary-row">
          <span className="purchase-entry__summary-label">Extra charges</span>
          <span className="purchase-entry__summary-value">{extra.toFixed(2)}</span>
        </div>
        <div className="purchase-entry__summary-row purchase-entry__summary-row--total">
          <span className="purchase-entry__summary-label">Final cost</span>
          <span className="purchase-entry__summary-value">{finalCost.toFixed(2)}</span>
        </div>
      </section>

      <div className="purchase-entry__actions">
        <button
          type="button"
          className="purchase-entry__btn purchase-entry__btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default PurchaseEntryPage
