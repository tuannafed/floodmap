import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

import { Open_Sans } from 'next/font/google'

const OpenSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'FloodMap - Bản Đồ Ngập Lụt Real-Time',
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
      <body className={OpenSans.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
