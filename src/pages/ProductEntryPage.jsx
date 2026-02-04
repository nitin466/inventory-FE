import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { db } from '../db'
import { getDiscountPercentage } from '../utils'
import { CategorySelector, DynamicFormRenderer, BarcodePreview } from '../components'
import './ProductEntryPage.css'

const initialCategorySelection = { categoryId: '', subcategoryId: '' }
const INITIAL_ATTRIBUTES_JSON = {}
const API_BASE = import.meta.env.VITE_API_URL ?? ''
const CONFIG_PATH = '/config'

function ProductEntryPage() {
  const [categorySelection, setCategorySelection] = useState(initialCategorySelection)
  const [attributeDefinitions, setAttributeDefinitions] = useState([])
  const [attributesJson, setAttributesJson] = useState(INITIAL_ATTRIBUTES_JSON)
  const [mrp, setMrp] = useState('')
  const [defaultSellingPrice, setDefaultSellingPrice] = useState('')
  const [maxDiscountPercent, setMaxDiscountPercent] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [savedSkus, setSavedSkus] = useState([])
  const [formKey, setFormKey] = useState(0)
  const attributesFormRef = useRef(null)

  const effectiveCategoryId =
    categorySelection.subcategoryId || categorySelection.categoryId || null

  useEffect(() => {
    setAttributesJson(INITIAL_ATTRIBUTES_JSON)
    setFormKey((k) => k + 1)
    if (!effectiveCategoryId) {
      setAttributeDefinitions([])
      return
    }
    let cancelled = false
    const url = `${API_BASE}${CONFIG_PATH}/attributes?categoryId=${effectiveCategoryId}`
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data)
          ? data
          : data?.data ?? data?.attributes ?? []
        setAttributeDefinitions(list)
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[ProductEntryPage] Failed to fetch attributes:', err.message)
          setAttributeDefinitions([])
        }
      })
    return () => { cancelled = true }
  }, [effectiveCategoryId])

  const loadSuppliers = useCallback(() => {
    db.suppliers.toArray().then((list) => setSuppliers(list))
  }, [])

  useEffect(() => {
    loadSuppliers()
    const t = setTimeout(loadSuppliers, 500)
    return () => clearTimeout(t)
  }, [loadSuppliers])

  const resetForm = useCallback(() => {
    setCategorySelection(initialCategorySelection)
    setAttributesJson(INITIAL_ATTRIBUTES_JSON)
    setMrp('')
    setDefaultSellingPrice('')
    setMaxDiscountPercent('')
    setSupplierId('')
    setQuantity('')
    setFormKey((k) => k + 1)
  }, [])

  const canSave = Boolean(supplierId)

  const discountPercent = useMemo(
    () => getDiscountPercentage(mrp, defaultSellingPrice),
    [mrp, defaultSellingPrice]
  )
  const maxDiscountNum = useMemo(
    () => Number(maxDiscountPercent),
    [maxDiscountPercent]
  )
  const isDiscountOverMax =
    !Number.isNaN(maxDiscountNum) &&
    maxDiscountNum < 100 &&
    discountPercent > maxDiscountNum

  const handleAttributesChange = useCallback((attributes_json) => {
    const plain =
      typeof attributes_json === 'object' &&
      attributes_json !== null &&
      !Array.isArray(attributes_json)
        ? attributes_json
        : INITIAL_ATTRIBUTES_JSON
    setAttributesJson(plain)
  }, [])

  const handleSave = useCallback(async () => {
    if (!supplierId) {
      alert('Please select a supplier')
      return
    }

    let attributesPayload = attributesJson
    if (attributeDefinitions.length > 0 && attributesFormRef.current) {
      const result = attributesFormRef.current.getAttributesJson()
      if (!result.valid) {
        const message =
          result.errors?.length > 0
            ? result.errors.join('\n')
            : 'Please fill in all required attributes'
        alert(message)
        return
      }
      attributesPayload = result.attributes_json
    }
    const attributesPlain =
      typeof attributesPayload === 'object' &&
      attributesPayload !== null &&
      !Array.isArray(attributesPayload)
        ? attributesPayload
        : {}

    const mrpNum = Number(mrp)
    const defaultSellingPriceNum = Number(defaultSellingPrice)
    const maxDiscountNum = Number(maxDiscountPercent)

    if (defaultSellingPriceNum > mrpNum) {
      alert('Default selling price cannot be greater than MRP')
      return
    }
    const discountPct = getDiscountPercentage(mrpNum, defaultSellingPriceNum)
    if (!Number.isNaN(maxDiscountNum) && discountPct > maxDiscountNum) {
      alert(`Discount (${discountPct}%) exceeds maximum allowed (${maxDiscountNum}%)`)
      return
    }

    const payload = {
      categoryId: categorySelection.categoryId,
      subcategoryId: categorySelection.subcategoryId || undefined,
      attributes_json: attributesPlain,
      mrp: mrpNum,
      default_selling_price: defaultSellingPriceNum,
      max_discount_percent: maxDiscountNum,
      supplierId: supplierId != null && supplierId !== '' ? String(supplierId) : undefined,
      quantityInStock: Number(quantity) || 0,
    }

    setSuccessMessage('')
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        if (res.status === 400) {
          let message = text
          try {
            const json = JSON.parse(text)
            message =
              json.message ??
              (Array.isArray(json.errors) ? json.errors.join('\n') : null) ??
              json.error ??
              text
          } catch {
            // use text as message
          }
          alert(`Validation error: ${message || 'Invalid data'}`)
          return
        }
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const skuList = Array.isArray(data.skus)
        ? data.skus
        : Array.isArray(data.skuList)
          ? data.skuList
          : data.sku != null
            ? [data.sku]
            : Array.isArray(data.data?.skus)
              ? data.data.skus
              : data.data?.sku != null
                ? [data.data.sku]
                : []
      const skuStrings = skuList.map((s) => String(s))
      setSavedSkus(skuStrings)
      setSuccessMessage(
        skuStrings.length > 0
          ? `Saved. SKU: ${skuStrings.join(', ')}`
          : 'Saved successfully.'
      )
      resetForm()
    } catch (err) {
      alert(err?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [
    categorySelection,
    attributesJson,
    attributeDefinitions.length,
    mrp,
    defaultSellingPrice,
    maxDiscountPercent,
    supplierId,
    quantity,
    resetForm,
  ])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <div className="product-entry">
      <h1 className="product-entry__title">Product Entry</h1>

      <section className="product-entry__section">
        <h2 className="product-entry__heading">Category</h2>
        <CategorySelector
          value={categorySelection}
          onChange={setCategorySelection}
        />
      </section>

      {attributeDefinitions.length > 0 && (
        <section className="product-entry__section">
          <h2 className="product-entry__heading">Attributes</h2>
          <DynamicFormRenderer
            ref={attributesFormRef}
            key={formKey}
            attributeDefinitions={attributeDefinitions}
            onChange={handleAttributesChange}
          />
        </section>
      )}

      <section className="product-entry__section">
        <h2 className="product-entry__heading">Pricing</h2>
        <div className="product-entry__row">
          <div className="product-entry__field">
            <label className="product-entry__label">MRP</label>
            <input
              type="number"
              step="any"
              min="0"
              className="product-entry__input"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              aria-label="MRP"
            />
          </div>
          <div className="product-entry__field">
            <label className="product-entry__label">Default Selling Price</label>
            <input
              type="number"
              step="any"
              min="0"
              className="product-entry__input"
              value={defaultSellingPrice}
              onChange={(e) => setDefaultSellingPrice(e.target.value)}
              aria-label="Default Selling Price"
            />
          </div>
          <div className="product-entry__field">
            <label className="product-entry__label">Max Discount %</label>
            <input
              type="number"
              step="any"
              min="0"
              max="100"
              className="product-entry__input"
              value={maxDiscountPercent}
              onChange={(e) => setMaxDiscountPercent(e.target.value)}
              aria-label="Max Discount Percent"
            />
          </div>
        </div>
        <div className="product-entry__pricing-meta">
          <span className="product-entry__discount-label">
            Discount: <strong>{discountPercent}%</strong>
          </span>
        </div>
        {isDiscountOverMax && (
          <p className="product-entry__warning" role="alert">
            Discount ({discountPercent}%) exceeds maximum allowed ({maxDiscountNum}%).
          </p>
        )}
      </section>

      <section className="product-entry__section">
        <h2 className="product-entry__heading">Supplier &amp; Quantity</h2>
        <div className="product-entry__row">
          <div className="product-entry__field">
            <label className="product-entry__label">Supplier (required)</label>
            <select
              className="product-entry__select"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              aria-label="Supplier"
              aria-required="true"
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="product-entry__field">
            <label className="product-entry__label">Quantity (pieces)</label>
            <input
              type="number"
              step="1"
              min="0"
              className="product-entry__input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-label="Quantity"
            />
          </div>
        </div>
      </section>

      {successMessage && (
        <p className="product-entry__success" role="status">
          {successMessage}
        </p>
      )}

      {savedSkus.length > 0 && (
        <section className="product-entry__section product-entry__barcode-preview">
          <h2 className="product-entry__heading">Barcode preview</h2>
          <div className="product-entry__barcodes">
            {savedSkus.map((sku) => (
              <BarcodePreview key={sku} sku={sku} />
            ))}
          </div>
          <div className="product-entry__actions">
            <button
              type="button"
              className="product-entry__btn product-entry__btn--secondary"
              onClick={handlePrint}
            >
              Print
            </button>
          </div>
        </section>
      )}

      <div className="product-entry__actions">
        <button
          type="button"
          className="product-entry__btn product-entry__btn--primary"
            onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? 'Saving…' : 'SAVE'}
        </button>
      </div>
    </div>
  )
}

export default ProductEntryPage
