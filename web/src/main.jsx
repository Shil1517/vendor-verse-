import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('VendorVerse failed to render.', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f8f7', color: '#173b3b', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ width: 'min(100%, 560px)', padding: 28, border: '1px solid #d5e5e1', borderRadius: 20, background: '#fff', boxShadow: '0 16px 40px rgba(20, 57, 69, .1)' }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>VendorVerse could not load</h1>
            <p style={{ margin: '0 0 16px', color: '#526b6b', lineHeight: 1.5 }}>A page error stopped the app from rendering. Reload the page to try again.</p>
            <pre style={{ maxHeight: 180, overflow: 'auto', padding: 12, borderRadius: 10, background: '#f4f8f7', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{this.state.error.message}</pre>
            <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '10px 16px', border: 0, borderRadius: 10, background: '#087e79', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Reload app</button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
