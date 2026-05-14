import { useState, useEffect, createContext, useContext, useCallback } from 'react'

/**
 * TOAST NOTIFICATION SYSTEM — Premium, Non-Blocking Notifications
 * Replaces all alert() calls with beautiful animated toasts.
 */

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be within ToastProvider')
  return ctx
}

const ICONS = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  copy: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

const STYLES = {
  success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: '#10b981' },
  error:   { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '#ef4444' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '#f59e0b' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '#3b82f6' },
  copy:    { bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', icon: '#8b5cf6' },
}

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false)
  const style = STYLES[toast.type] || STYLES.info

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(toast.id), 400)
    }, toast.duration || 3500)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <div
      className={`ns-toast-item ${exiting ? 'ns-toast-exit' : 'ns-toast-enter'}`}
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.text,
      }}
      role="alert"
    >
      <div className="ns-toast-icon" style={{ color: style.icon }}>
        {ICONS[toast.type] || ICONS.info}
      </div>
      <div className="ns-toast-content">
        {toast.title && <p className="ns-toast-title">{toast.title}</p>}
        <p className="ns-toast-message">{toast.message}</p>
      </div>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300) }}
        className="ns-toast-close"
        aria-label="Cerrar notificación"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Progress bar */}
      <div className="ns-toast-progress" style={{ backgroundColor: style.icon }}>
        <div
          className="ns-toast-progress-fill"
          style={{
            animationDuration: `${toast.duration || 3500}ms`,
            backgroundColor: style.icon,
          }}
        />
      </div>
    </div>
  )
}

let toastIdCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = ++toastIdCounter
    setToasts(prev => [...prev.slice(-4), { id, message, type, ...options }])
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback({
    success: (msg, opts) => addToast(msg, 'success', opts),
    error: (msg, opts) => addToast(msg, 'error', opts),
    warning: (msg, opts) => addToast(msg, 'warning', opts),
    info: (msg, opts) => addToast(msg, 'info', opts),
    copy: (msg, opts) => addToast(msg, 'copy', opts),
  }, [addToast])

  // Make toast callable as both toast.success() and toast()
  const toastFn = useCallback((msg, type, opts) => addToast(msg, type, opts), [addToast])
  toastFn.success = toast.success
  toastFn.error = toast.error
  toastFn.warning = toast.warning
  toastFn.info = toast.info
  toastFn.copy = toast.copy

  return (
    <ToastContext.Provider value={toastFn}>
      {children}
      {/* Toast Container */}
      <div className="ns-toast-container" aria-live="polite">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
