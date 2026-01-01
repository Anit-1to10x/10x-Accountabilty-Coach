// WebSocket client for communication with Claude Code CLI
// Claude Code runs a WebSocket server that the UI connects to

type MessageHandler = (message: WebSocketMessage) => void
type ConnectionHandler = (connected: boolean) => void

export interface WebSocketMessage {
  type: 'register' | 'registered' | 'chat' | 'status' | 'file_update' | 'error' | 'typing' | 'response_start' | 'response_chunk' | 'response_end' | 'skill_start' | 'skill_complete'
  agentId?: string
  content?: string
  data?: Record<string, any>
  timestamp?: string
  requestId?: string
  clientType?: 'ui' | 'claude-cli'
  fullContent?: string
  // Skill execution fields
  skillId?: string
  skillName?: string
  skillUsed?: string
  success?: boolean
  actions?: Array<{ type: string; description: string; timestamp: string }>
  dataUpdated?: string[]
}

export interface PendingRequest {
  resolve: (value: string) => void
  reject: (error: Error) => void
  chunks: string[]
}

// Streaming callback types
export type StreamingCallback = (event: StreamingEvent) => void

export interface StreamingEvent {
  type: 'start' | 'chunk' | 'end' | 'error' | 'skill_start' | 'skill_complete'
  requestId: string
  content?: string        // For 'chunk' events
  fullContent?: string    // For 'end' events
  error?: string          // For 'error' events
  // Skill execution fields
  skillId?: string
  skillName?: string
  success?: boolean
  actions?: Array<{ type: string; description: string; timestamp: string }>
  dataUpdated?: string[]
}

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private messageHandlers: Set<MessageHandler> = new Set()
  private connectionHandlers: Set<ConnectionHandler> = new Set()
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private streamingCallbacks: Map<string, StreamingCallback> = new Map()
  private isConnecting = false
  private shouldReconnect = true

  constructor(url: string = 'ws://localhost:8765') {
    this.url = url
  }

  // Connect to Claude Code's WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        const checkConnection = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection)
            resolve()
          }
        }, 100)
        return
      }

      this.isConnecting = true
      this.shouldReconnect = true

      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected to server, registering as UI client...')
          this.isConnecting = false
          this.reconnectAttempts = 0

          // Register as UI client
          this.send({
            type: 'register',
            clientType: 'ui',
            timestamp: new Date().toISOString()
          })

          this.notifyConnectionHandlers(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('[WebSocket] Connection closed:', event.code, event.reason)
          this.isConnecting = false
          this.notifyConnectionHandlers(false)

          // Notify streaming callbacks of disconnect
          this.streamingCallbacks.forEach((callback, requestId) => {
            callback({
              type: 'error',
              requestId,
              error: 'Connection closed unexpectedly'
            })
          })
          this.streamingCallbacks.clear()

          // Attempt to reconnect if not intentionally closed
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error)
          this.isConnecting = false

          if (this.reconnectAttempts === 0) {
            reject(new Error('Failed to connect to Claude Code WebSocket server'))
          }
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    this.shouldReconnect = false

    // Notify all streaming callbacks of disconnect
    this.streamingCallbacks.forEach((callback, requestId) => {
      callback({
        type: 'error',
        requestId,
        error: 'Connection lost during streaming'
      })
    })
    this.streamingCallbacks.clear()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }
  }

  // Send a message through WebSocket
  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('[WebSocket] Cannot send - not connected')
      throw new Error('WebSocket not connected')
    }
  }

  // Send a chat message and wait for response
  sendChatMessage(agentId: string, content: string, attachments?: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Store the pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        chunks: [],
      })

      // Set a timeout for the response
      const timeout = setTimeout(() => {
        const pending = this.pendingRequests.get(requestId)
        if (pending) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Response timeout'))
        }
      }, 120000) // 2 minute timeout

      // Send the message
      try {
        this.send({
          type: 'chat',
          agentId,
          content,
          requestId,
          timestamp: new Date().toISOString(),
          data: { attachments },
        })
      } catch (error) {
        clearTimeout(timeout)
        this.pendingRequests.delete(requestId)
        reject(error)
      }
    })
  }

  // Send message with streaming callback support
  sendChatMessageStreaming(
    agentId: string,
    content: string,
    onStream: StreamingCallback,
    attachments?: string[]
  ): { requestId: string; cancel: () => void } {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Register streaming callback
    this.streamingCallbacks.set(requestId, onStream)

    // Set a timeout
    const timeout = setTimeout(() => {
      if (this.streamingCallbacks.has(requestId)) {
        this.streamingCallbacks.delete(requestId)
        onStream({ type: 'error', requestId, error: 'Response timeout' })
      }
    }, 120000) // 2 minute timeout

    // Send the message
    try {
      this.send({
        type: 'chat',
        agentId,
        content,
        requestId,
        timestamp: new Date().toISOString(),
        data: { attachments },
      })
    } catch (error) {
      clearTimeout(timeout)
      this.streamingCallbacks.delete(requestId)
      onStream({ type: 'error', requestId, error: (error as Error).message })
    }

    // Return cancel function
    return {
      requestId,
      cancel: () => {
        clearTimeout(timeout)
        this.streamingCallbacks.delete(requestId)
      }
    }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage): void {
    // Notify all registered handlers
    this.messageHandlers.forEach(handler => handler(message))

    // Handle specific message types
    switch (message.type) {
      case 'registered':
        console.log('[WebSocket] Successfully registered as UI client')
        break

      case 'response_start':
        // Claude Code is starting to respond
        console.log('[WebSocket] Response started for', message.requestId)
        if (message.requestId) {
          const callback = this.streamingCallbacks.get(message.requestId)
          if (callback) {
            callback({ type: 'start', requestId: message.requestId })
          }
        }
        break

      case 'response_chunk':
        // Streaming response chunk
        if (message.requestId) {
          const callback = this.streamingCallbacks.get(message.requestId)
          if (callback && message.content) {
            callback({
              type: 'chunk',
              requestId: message.requestId,
              content: message.content
            })
          }
          // Still collect for pendingRequests (backward compatibility)
          const pending = this.pendingRequests.get(message.requestId)
          if (pending && message.content) {
            pending.chunks.push(message.content)
          }
        }
        break

      case 'response_end':
        // Response complete
        if (message.requestId) {
          const callback = this.streamingCallbacks.get(message.requestId)
          if (callback) {
            const fullContent = message.fullContent ||
              this.pendingRequests.get(message.requestId)?.chunks.join('') || ''
            callback({
              type: 'end',
              requestId: message.requestId,
              fullContent
            })
            this.streamingCallbacks.delete(message.requestId)
          }
          // Handle pendingRequests (backward compatibility)
          const pending = this.pendingRequests.get(message.requestId)
          if (pending) {
            const fullResponse = message.fullContent || pending.chunks.join('')
            this.pendingRequests.delete(message.requestId)
            pending.resolve(fullResponse)
            console.log('[WebSocket] Response completed for', message.requestId)
          }
        }
        break

      case 'error':
        // Error response
        if (message.requestId) {
          const callback = this.streamingCallbacks.get(message.requestId)
          if (callback) {
            callback({
              type: 'error',
              requestId: message.requestId,
              error: message.content || 'Unknown error'
            })
            this.streamingCallbacks.delete(message.requestId)
          }
          // Handle pendingRequests (backward compatibility)
          const pending = this.pendingRequests.get(message.requestId)
          if (pending) {
            this.pendingRequests.delete(message.requestId)
            pending.reject(new Error(message.content || 'Unknown error'))
          }
        }
        break

      case 'file_update':
        // File was updated by Claude Code
        // The UI can react to this (e.g., refresh file tree, update plan view)
        break

      case 'typing':
        // Claude Code is typing
        break

      case 'skill_start':
        // A skill is being executed
        console.log('[WebSocket] Skill execution started:', message.skillId, message.skillName)
        if (message.requestId) {
          const callback = this.streamingCallbacks.get(message.requestId)
          if (callback) {
            callback({
              type: 'skill_start',
              requestId: message.requestId,
              skillId: message.skillId,
              skillName: message.skillName
            })
          }
        }
        break

      case 'skill_complete':
        // Skill execution completed
        console.log('[WebSocket] Skill execution completed:', message.skillId, message.success)
        if (message.requestId) {
          const callback = this.streamingCallbacks.get(message.requestId)
          if (callback) {
            callback({
              type: 'skill_complete',
              requestId: message.requestId,
              skillId: message.skillId,
              success: message.success,
              actions: message.actions,
              dataUpdated: message.dataUpdated
            })
          }
        }
        break
    }
  }

  // Schedule a reconnection attempt
  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch(error => {
          console.error('[WebSocket] Reconnection failed:', error)
        })
      }
    }, delay)
  }

  // Register a message handler
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  // Register a connection status handler
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler)
    return () => this.connectionHandlers.delete(handler)
  }

  // Notify connection handlers
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => handler(connected))
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // Get connection status
  getStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected'
    if (this.isConnecting || this.ws?.readyState === WebSocket.CONNECTING) return 'connecting'
    return 'disconnected'
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    // Check for custom WebSocket URL from environment
    const wsUrl = typeof window !== 'undefined'
      ? (window as any).__CLAUDE_WS_URL__ || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765'
      : 'ws://localhost:8765'

    wsClient = new WebSocketClient(wsUrl)
  }
  return wsClient
}

// React hook for WebSocket connection
export function useWebSocket() {
  // This hook will be used in components to get WebSocket status and send messages
  const client = getWebSocketClient()

  return {
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    sendMessage: (agentId: string, content: string) => client.sendChatMessage(agentId, content),
    onMessage: (handler: MessageHandler) => client.onMessage(handler),
    onConnectionChange: (handler: ConnectionHandler) => client.onConnectionChange(handler),
    isConnected: () => client.isConnected(),
    getStatus: () => client.getStatus(),
  }
}
