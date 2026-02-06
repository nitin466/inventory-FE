import { useEffect, useRef, useState } from 'react'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { BrowserMultiFormatReader } from '@zxing/browser'
import './CameraScanModal.css'

const hints = new Map()
hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39])

/** Back camera on mobile (environment), with ideal resolution. No listVideoInputDevices. */
const VIDEO_CONSTRAINTS = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
}

/**
 * Modal that uses the device camera to scan barcodes (CODE_128, CODE_39).
 * Uses back camera on mobile (facingMode: environment). On decode, onScan(decodedText) is
 * called with the SKU, camera stops, and modal closes. PWA / iOS Safari friendly (playsInline, muted).
 */
function CameraScanModal({ open, onClose, onScan }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('idle') // 'idle' | 'starting' | 'scanning'

  useEffect(() => {
    if (!open) {
      setError(null)
      setStatus('idle')
      return
    }

    const video = videoRef.current
    if (!video) {
      setStatus('idle')
      return
    }

    let cancelled = false
    const codeReader = new BrowserMultiFormatReader(hints)

    setStatus('starting')
    setError(null)

    codeReader
      .decodeFromConstraints(VIDEO_CONSTRAINTS, video, (result, err, controls) => {
        if (cancelled) return
        if (result) {
          const text = result.getText()
          const trimmed = text != null ? String(text).trim() : ''
          if (trimmed === '') return
          try {
            if (controls) controls.stop()
          } finally {
            controlsRef.current = null
          }
          onScan(trimmed)
          onClose()
        }
      })
      .then((controls) => {
        if (!cancelled && controls) {
          controlsRef.current = controls
          setStatus('scanning')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message =
            err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
              ? 'Camera permission denied'
              : (err?.message ?? 'Failed to access camera')
          setError(message)
          setStatus('idle')
        }
      })

    return () => {
      cancelled = true
      const ctrl = controlsRef.current
      if (ctrl) {
        try {
          ctrl.stop()
        } catch (_) {
          // ignore
        }
        controlsRef.current = null
      }
    }
  }, [open, onScan, onClose])

  const handleClose = () => {
    const ctrl = controlsRef.current
    if (ctrl) {
      try {
        ctrl.stop()
      } catch (_) {
        // ignore
      }
      controlsRef.current = null
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="camera-scan-modal" role="dialog" aria-modal="true" aria-labelledby="camera-scan-title">
      <div className="camera-scan-modal__backdrop" onClick={handleClose} aria-hidden="true" />
      <div className="camera-scan-modal__content">
        <h2 id="camera-scan-title" className="camera-scan-modal__title">
          Scan barcode
        </h2>
        <div className="camera-scan-modal__video-wrap">
          <video
            ref={videoRef}
            className="camera-scan-modal__video"
            autoPlay
            playsInline
            muted
            style={{ display: status === 'scanning' ? 'block' : 'none' }}
          />
          {status === 'starting' && (
            <p className="camera-scan-modal__status">Requesting camera…</p>
          )}
          {error && (
            <p className="camera-scan-modal__error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          className="camera-scan-modal__close"
          onClick={handleClose}
          aria-label="Close"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default CameraScanModal
