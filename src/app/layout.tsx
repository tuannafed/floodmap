import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'FloodMap - Bản Đồ Ngập Lụt Realtime',
  description:
    'Ứng dụng web hiển thị bản đồ ngập lụt realtime và dự báo ngắn hạn',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
