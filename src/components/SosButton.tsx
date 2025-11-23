'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { SosForm } from './SosForm'

interface SosButtonProps {
  onSosSubmitted?: () => void
}

export function SosButton({ onSosSubmitted }: SosButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-2000 bg-error-600 hover:bg-error-700 text-white rounded-full px-6 py-3 transition-all hover:scale-110 active:scale-95 flex items-center gap-2 text-lg font-medium"
        aria-label="Gửi SOS cứu nạn"
      >
        <span className="hidden sm:inline">🆘 Gửi SOS</span>
        <span className="sm:hidden">SOS</span>
      </button>

      {isOpen && (
        <SosForm
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            setIsOpen(false)
            onSosSubmitted?.()
          }}
        />
      )}
    </>
  )
}
