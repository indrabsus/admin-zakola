"use client"

import { useEffect, useMemo, useState } from "react"
import Swal from "sweetalert2"
import { Loader2, MessageCircle, RefreshCcw, Send, Wifi, WifiOff } from "lucide-react"
import AppShell from "@/components/app-shell"
import { waFetch } from "@/lib/api"
import type { WaChat, WaStatus, WaStatusResponse } from "@/types/whatsapp"

const formatWaktu = (waktu: string) => {
  if (!waktu) return "-"

  return new Date(waktu).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function WhatsappBotPage() {
  const [status, setStatus] = useState<WaStatus | null>(null)

  const [chats, setChats] = useState<WaChat[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  const [chatsError, setChatsError] = useState<string | null>(null)

  const [nomorTujuan, setNomorTujuan] = useState("")
  const [pesan, setPesan] = useState("")
  const [sending, setSending] = useState(false)

  const fetchStatus = async () => {
    try {
      const res: { data: WaStatusResponse } = await waFetch("/wa/status")
      setStatus(res.data.status)
    } catch {
      setStatus(null)
    }
  }

  const fetchChats = async () => {
    try {
      setLoadingChats(true)
      const res: { data: WaChat[] } = await waFetch("/wa/chats")
      setChats(res.data || [])
      setChatsError(null)
    } catch (err) {
      setChatsError(err instanceof Error ? err.message : "Gagal mengambil pesan masuk")
    } finally {
      setLoadingChats(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchChats()

    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const chatsTerurut = useMemo(() => {
    return [...chats].sort(
      (a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()
    )
  }, [chats])

  const handleKirim = async () => {
    if (!nomorTujuan.trim() || !pesan.trim()) return

    try {
      setSending(true)
      await waFetch("/wa/kirim", {
        method: "POST",
        body: JSON.stringify({ nomor: nomorTujuan, pesan }),
      })
      Swal.fire("Terkirim", "Pesan berhasil dikirim.", "success")
      setPesan("")
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSending(false)
    }
  }

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">WhatsApp Bot</h1>
        <p className="text-sm text-slate-500">
          Status koneksi, kirim pesan manual, dan pesan masuk terakhir.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={
                  status === "ready"
                    ? "flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                    : "flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                }
              >
                {status === "ready" ? <Wifi size={22} /> : <WifiOff size={22} />}
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  {status === "ready" ? "WhatsApp Terhubung" : "WhatsApp Tidak Terhubung"}
                </p>
                <p className="text-xs text-slate-500">
                  {status === "ready"
                    ? "Bot siap mengirim & menerima pesan."
                    : "Pastikan bot wabot-claude berjalan dan sudah login (scan QR di terminal bot)."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-800">Kirim Pesan</h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Nomor Tujuan
                </label>
                <input
                  value={nomorTujuan}
                  onChange={(e) => setNomorTujuan(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Pesan
                </label>
                <textarea
                  value={pesan}
                  onChange={(e) => setPesan(e.target.value)}
                  rows={4}
                  placeholder="Tulis pesan..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <button
                onClick={handleKirim}
                disabled={!nomorTujuan.trim() || !pesan.trim() || sending || status !== "ready"}
                title={status !== "ready" ? "Server WhatsApp tidak terhubung" : undefined}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                {sending ? "Mengirim..." : "Kirim"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <MessageCircle size={16} />
              Pesan Masuk Terakhir
            </h2>

            <button
              onClick={fetchChats}
              disabled={loadingChats}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCcw size={14} className={loadingChats ? "animate-spin" : ""} />
              Muat Ulang
            </button>
          </div>

          {loadingChats ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Memuat pesan...
            </div>
          ) : chatsError ? (
            <p className="p-4 text-center text-sm text-slate-500">{chatsError}</p>
          ) : chatsTerurut.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">Belum ada pesan masuk.</p>
          ) : (
            <div className="max-h-112 space-y-2 overflow-y-auto">
              {chatsTerurut.map((chat, index) => (
                <div
                  key={`${chat.nomor}-${chat.waktu}-${index}`}
                  className="rounded-xl border border-slate-100 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{chat.nomor}</p>
                    <p className="shrink-0 text-[11px] text-slate-400">
                      {formatWaktu(chat.waktu)}
                    </p>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">
                    {chat.pesan}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
