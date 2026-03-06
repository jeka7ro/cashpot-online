import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App.jsx'
import './index.css'

// ErrorBoundary to catch render errors and show useful info
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('🔴 ErrorBoundary caught:', error)
    console.error('🔴 Component stack:', errorInfo?.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#1e1e2e', color: '#cdd6f4', minHeight: '100vh' }}>
          <h1 style={{ color: '#f38ba8' }}>❌ React Render Error</h1>
          <pre style={{ color: '#fab387', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.toString()}
          </pre>
          <h2 style={{ color: '#89b4fa', marginTop: 20 }}>Component Stack:</h2>
          <pre style={{ color: '#a6e3a1', whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '10px 20px', background: '#89b4fa', color: '#1e1e2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
          >
            🔄 Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ThemeProvider>
  </React.StrictMode>
)
