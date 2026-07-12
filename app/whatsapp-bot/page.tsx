"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Swal from "sweetalert2"
import { Loader2, LogOut, MessageCircle, QrCode, Search, Send } from "lucide-react"
import AppShell from "@/components/app-shell"
import { apiFetch } from "@/lib/api"
import { getWaSocket, disconnectWaSocket } from "@/lib/socket"
import type { WaChat, WaMessage, WaStatus, WaStatusResponse } from "@/types/whatsapp"

const formatTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })

const formatDay = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  })

function WaMedia({ chatId, messageId }: { chatId: string; messageId: string }) {
  const [media, setMedia] = useState<{ mimetype: string; data: string } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    apiFetch(
      `/wa/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/media`
    )
      .then((res: { data: { mimetype: string; data: string } }) => {
        if (!cancelled) setMedia(res.data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [chatId, messageId])

  if (failed) return <span className="italic opacity-80">[Media tidak tersedia]</span>
  if (!media) return <Loader2 className="animate-spin opacity-70" size={16} />

  if (media.mimetype.startsWith("image/")) {
    return (
      <img
        src={`data:${media.mimetype};base64,${media.data}`}
        alt="Media"
        className="max-h-64 max-w-xs rounded-lg"
      />
    )
  }

  return (
    <a
      href={`data:${media.mimetype};base64,${media.data}`}
      download
      className="underline"
    >
      Unduh berkas
    </a>
  )
}

export default function WhatsappBotPage() {
  const [status, setStatus] = useState<WaStatus>("idle")
  const [qr, setQr] = useState<string | null>(null)
  const [info, setInfo] = useState<WaStatusResponse["info"]>(null)

  const [chats, setChats] = useState<WaChat[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  const [search, setSearch] = useState("")

  const [selectedChat, setSelectedChat] = useState<WaChat | null>(null)
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedChatRef = useRef<WaChat | null>(null)
  const statusRef = useRef<WaStatus>(status)

  useEffect(() => {
    selectedChatRef.current = selectedChat
  }, [selectedChat])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const fetchStatus = async () => {
    try {
      const res: { data: WaStatusResponse } = await apiFetch("/wa/status")
      setStatus(res.data.status)
      setQr(res.data.qr)
      setInfo(res.data.info)
    } catch {
      // biarkan status apa adanya, akan dicoba lagi via polling
    }
  }

  const fetchChats = async () => {
    try {
      setLoadingChats(true)
      const res: { data: WaChat[] } = await apiFetch("/wa/chats")
      setChats(res.data)
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoadingChats(false)
    }
  }

  const fetchMessages = async (chat: WaChat) => {
    try {
      setLoadingMessages(true)
      const res: { data: WaMessage[] } = await apiFetch(
        `/wa/chats/${encodeURIComponent(chat.id)}/messages`
      )
      setMessages(res.data)
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    const socket = getWaSocket()

    socket.on("status", (payload: { status: WaStatus; info: WaStatusResponse["info"] }) => {
      setStatus(payload.status)
      setInfo(payload.info)
      if (payload.status !== "qr") setQr(null)
    })

    socket.on("qr", (dataUrl: string) => {
      setQr(dataUrl)
      setStatus("qr")
    })

    socket.on("message", (message: WaMessage) => {
      const chatId = message.chatId

      const isOpenChat = selectedChatRef.current?.id === chatId

      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === chatId)
        if (idx === -1) return prev

        const updated = [...prev]
        updated[idx] = {
          ...updated[idx],
          lastMessage: {
            body: message.body,
            fromMe: message.fromMe,
            timestamp: message.timestamp,
            hasMedia: message.hasMedia,
          },
          timestamp: message.timestamp,
          unreadCount:
            message.fromMe || isOpenChat ? updated[idx].unreadCount : updated[idx].unreadCount + 1,
        }
        const [chat] = updated.splice(idx, 1)
        return [chat, ...updated]
      })

      if (selectedChatRef.current && selectedChatRef.current.id === chatId) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
      }
    })

    const interval = setInterval(() => {
      if (statusRef.current !== "ready") fetchStatus()
    }, 10000)

    return () => {
      clearInterval(interval)
      socket.off("status")
      socket.off("qr")
      socket.off("message")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status === "ready") fetchChats()
  }, [status])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    return () => {
      disconnectWaSocket()
    }
  }, [])

  const openChat = (chat: WaChat) => {
    setSelectedChat(chat)
    setMessages([])
    fetchMessages(chat)
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)))
  }

  const handleSend = async () => {
    if (!selectedChat || !draft.trim()) return

    try {
      setSending(true)
      const res: { data: WaMessage } = await apiFetch(
        `/wa/chats/${encodeURIComponent(selectedChat.id)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ body: draft }),
        }
      )
      setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]))
      setDraft("")
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    const confirm = await Swal.fire({
      title: "Putuskan WhatsApp?",
      text: "Sesi WhatsApp yang tersambung akan diputus dan perlu memindai QR lagi untuk terhubung.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Putuskan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch("/wa/logout", { method: "POST" })
      setSelectedChat(null)
      setMessages([])
      setChats([])
      setInfo(null)
      setStatus("idle")
      fetchStatus()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats
    const q = search.toLowerCase()
    return chats.filter((c) => c.name.toLowerCase().includes(q))
  }, [chats, search])

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">WhatsApp Bot</h1>
        <p className="text-sm text-slate-500">
          Hubungkan nomor WhatsApp dengan memindai QR, lalu kirim dan terima pesan langsung dari sini.
        </p>
      </div>

      {status !== "ready" ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white p-12 text-center shadow">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <QrCode className="text-blue-600" size={28} />
          </div>

          {status === "qr" && qr ? (
            <>
              <h2 className="text-lg font-bold text-slate-800">Pindai QR untuk Terhubung</h2>
              <img src={qr} alt="WhatsApp QR Code" className="h-64 w-64 rounded-xl border" />
              <p className="max-w-md text-sm text-slate-500">
                Buka WhatsApp di HP → <b>Perangkat Tertaut</b> → <b>Tautkan Perangkat</b> → pindai
                kode QR di atas. QR akan diperbarui otomatis jika kedaluwarsa.
              </p>
            </>
          ) : status === "disconnected" ? (
            <>
              <h2 className="text-lg font-bold text-slate-800">Terputus</h2>
              <p className="max-w-md text-sm text-slate-500">
                Koneksi WhatsApp terputus. Sedang mencoba menyambungkan ulang...
              </p>
              <Loader2 className="animate-spin text-slate-400" size={22} />
            </>
          ) : status === "authenticated" ? (
            <>
              <h2 className="text-lg font-bold text-slate-800">Berhasil Terhubung</h2>
              <p className="max-w-md text-sm text-slate-500">
                QR berhasil dipindai. Sedang menyinkronkan riwayat chat dari WhatsApp, biasanya
                memakan waktu beberapa puluh detik untuk chat pertama kali.
              </p>
              <Loader2 className="animate-spin text-slate-400" size={22} />
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-800">Menyiapkan WhatsApp...</h2>
              <p className="max-w-md text-sm text-slate-500">
                Mohon tunggu, sedang menyiapkan koneksi WhatsApp. Kode QR akan muncul di sini.
              </p>
              <Loader2 className="animate-spin text-slate-400" size={22} />
            </>
          )}
        </div>
      ) : (
        <div className="flex h-[calc(100vh-13rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex w-80 shrink-0 flex-col border-r border-slate-200">
            <div className="border-b p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{info?.name || "Terhubung"}</p>
                  <p className="text-xs text-slate-500">{info?.number || ""}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Putuskan"
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                >
                  <LogOut size={18} />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari percakapan..."
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingChats ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                  <Loader2 className="animate-spin" size={18} />
                  Memuat percakapan...
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Belum ada percakapan.</div>
              ) : (
                filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => openChat(chat)}
                    className={
                      selectedChat?.id === chat.id
                        ? "flex w-full items-start gap-3 border-b border-slate-100 border-l-4 border-l-blue-600 bg-blue-100 p-3 pl-2.5 text-left"
                        : "flex w-full items-start gap-3 border-b border-slate-100 border-l-4 border-l-transparent p-3 pl-2.5 text-left hover:bg-slate-50"
                    }
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                      {chat.name.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">{chat.name}</p>
                        {chat.lastMessage && (
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {formatDay(chat.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-slate-500">
                          {chat.lastMessage
                            ? `${chat.lastMessage.fromMe ? "Anda: " : ""}${
                                chat.lastMessage.hasMedia && !chat.lastMessage.body
                                  ? "[Media]"
                                  : chat.lastMessage.body
                              }`
                            : "Belum ada pesan"}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            {!selectedChat ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
                <MessageCircle size={40} />
                <p className="text-sm">Pilih percakapan untuk mulai chat</p>
              </div>
            ) : (
              <>
                <div className="border-b p-4">
                  <p className="text-sm font-bold text-slate-800">{selectedChat.name}</p>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                      <Loader2 className="animate-spin" size={18} />
                      Memuat pesan...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={msg.fromMe ? "flex justify-end" : "flex justify-start"}
                        >
                          <div
                            className={
                              msg.fromMe
                                ? "max-w-md rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2 text-sm text-white"
                                : "max-w-md rounded-2xl rounded-tl-sm bg-white px-4 py-2 text-sm text-slate-800 shadow-sm"
                            }
                          >
                            {msg.hasMedia ? (
                              <WaMedia chatId={selectedChat.id} messageId={msg.id} />
                            ) : (
                              <p className="whitespace-pre-wrap">{msg.body}</p>
                            )}
                            {msg.hasMedia && msg.body && (
                              <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
                            )}
                            <p
                              className={
                                msg.fromMe
                                  ? "mt-1 text-right text-[10px] text-blue-100"
                                  : "mt-1 text-right text-[10px] text-slate-400"
                              }
                            >
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t p-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Tulis pesan..."
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
