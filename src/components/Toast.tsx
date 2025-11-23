'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle2 className="size-5 text-success-600" />,
    error: <XCircle className="size-5 text-error-600" />,
    warning: <AlertCircle className="size-5 text-warning-600" />,
    info: <AlertCircle className="size-5 text-info-600" />,
  }

  const bgColors = {
    success:
      'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800',
    error:
      'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800',
    warning:
      'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800',
    info: 'bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800',
  }

  const textColors = {
    success: 'text-success-700 dark:text-success-300',
    error: 'text-error-700 dark:text-error-300',
    warning: 'text-warning-700 dark:text-warning-300',
    info: 'text-info-700 dark:text-info-300',
  }

  return (
    <div
      className={`fixed top-4 right-4 z-4000 ${bgColors[type]} ${textColors[type]} border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-md animate-in slide-in-from-right-5 fade-in`}
    >
      {icons[type]}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className={`${textColors[type]} hover:opacity-70 transition-opacity`}
        aria-label="Đóng"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-2 right-4 z-4000 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  )
}
