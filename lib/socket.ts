import { io, Socket } from "socket.io-client"
import { API_URL } from "@/lib/api"
import { getToken } from "@/lib/auth"

let waSocket: Socket | null = null

export const getWaSocket = () => {
  if (waSocket) return waSocket

  waSocket = io(`${API_URL}/wa`, {
    auth: { token: getToken() },
    autoConnect: true,
  })

  return waSocket
}

export const disconnectWaSocket = () => {
  waSocket?.disconnect()
  waSocket = null
}
