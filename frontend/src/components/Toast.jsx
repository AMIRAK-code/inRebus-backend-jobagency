/**
 * Toast notification system.
 * Usage: import useToast from './useToast'
 * const { toasts, addToast } = useToast()
 * Then render <ToastContainer toasts={toasts} />
 */

import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

let toastIdCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastIdCounter
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

const ICONS = {
  success: <CheckCircle size={16} />,
  error: <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
}

const COLORS = {
  success: { bg: 'bg-[#0d2b1a]', border: 'border-[#166534]', icon: 'text-[#4ade80]', text: 'text-[#bbf7d0]' },
  error: { bg: 'bg-[#2b0d0d]', border: 'border-[#991b1b]', icon: 'text-[#f87171]', text: 'text-[#fecaca]' },
  warning: { bg: 'bg-[#2b1f0d]', border: 'border-[#92400e]', icon: 'text-[#fbbf24]', text: 'text-[#fde68a]' },
  info: { bg: 'bg-[#0d1e2b]', border: 'border-[#1e40af]', icon: 'text-[#60a5fa]', text: 'text-[#bfdbfe]' },
}

function Toast({ toast, onRemove }) {
  const c = COLORS[toast.type] || COLORS.info
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${c.bg} ${c.border} shadow-lg min-w-[280px] max-w-[380px] animate-in slide-in-from-right-5 fade-in duration-300`}
    >
      <span className={`${c.icon} shrink-0 mt-0.5`}>{ICONS[toast.type]}</span>
      <p className={`text-sm flex-1 ${c.text} leading-snug`}>{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className={`${c.icon} hover:opacity-70 shrink-0 -mr-1 mt-0.5 transition-opacity`}>
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}
