import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WebSocketManager } from '@/components/websocket/WebSocketManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OpenAnalyst Accountability Coach',
  description: 'Your Personal AI-Powered Accountability System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <WebSocketManager />
      </body>
    </html>
  )
}
