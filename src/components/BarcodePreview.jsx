import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import './BarcodePreview.css'

function BarcodePreview({ sku }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sku) return
    try {
      JsBarcode(canvas, String(sku), { format: 'CODE128' })
    } catch (e) {
      console.warn('[BarcodePreview] JsBarcode failed for', sku, e)
    }
  }, [sku])

  if (!sku) return null

  return (
    <div className="barcode-preview">
      <canvas ref={canvasRef} aria-label={`Barcode for ${sku}`} />
      <span className="barcode-preview__sku">{sku}</span>
    </div>
  )
}

export default BarcodePreview
