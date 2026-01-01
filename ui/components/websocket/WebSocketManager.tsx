'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { getWebSocketClient } from '@/lib/websocket'

/**
 * WebSocket Manager
 * Manages WebSocket connection and shows connection status
 */
export function WebSocketManager() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')

  useEffect(() => {
    const wsClient = getWebSocketClient()

    // Set up connection handler
    const unsubscribe = wsClient.onConnectionChange((connected) => {
      setStatus(connected ? 'connected' : 'disconnected')
    })

    // Connect to WebSocket
    setStatus('connecting')
    wsClient.connect().catch((error) => {
      console.error('Failed to connect to WebSocket:', error)
      setStatus('disconnected')
    })

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [])

  // Show status indicator
  const getStatusDisplay = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-3 h-3 text-green-500" />,
          text: 'Connected',
          color: 'text-green-600'
        }
      case 'connecting':
        return {
          icon: <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />,
          text: 'Connecting...',
          color: 'text-yellow-600'
        }
      case 'disconnected':
        return {
          icon: <WifiOff className="w-3 h-3 text-red-500" />,
          text: 'Disconnected',
          color: 'text-red-600'
        }
    }
  }

  const display = getStatusDisplay()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-oa-bg-secondary border border-oa-border shadow-lg">
        {display.icon}
        <span className={`text-xs ${display.color}`}>{display.text}</span>
      </div>
    </div>
  )
}
