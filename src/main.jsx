import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { bootstrap } from './services/bootstrap.service.js'

const root = createRoot(document.getElementById('root'))

function Root() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    bootstrap().then(() => setReady(true)).catch(() => setReady(true))
  }, [])
  if (!ready) {
    return <div style={{ padding: '1rem', fontFamily: 'system-ui' }}>Loading…</div>
  }
  return (
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  )
}

root.render(<Root />)
