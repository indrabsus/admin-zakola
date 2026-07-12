export type WaStatus = "idle" | "loading" | "qr" | "authenticated" | "ready" | "disconnected"

export type WaInfo = {
  number: string | null
  name: string | null
}

export type WaStatusResponse = {
  status: WaStatus
  qr: string | null
  info: WaInfo | null
}

export type WaLastMessage = {
  body: string
  fromMe: boolean
  timestamp: number
  hasMedia: boolean
}

export type WaChat = {
  id: string
  name: string
  isGroup: boolean
  unreadCount: number
  timestamp: number
  lastMessage: WaLastMessage | null
}

export type WaMessage = {
  id: string
  chatId: string
  body: string
  fromMe: boolean
  timestamp: number
  author: string | null
  hasMedia: boolean
  type: string
}
