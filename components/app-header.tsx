"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"
import { ChevronDown, KeyRound, LogOut, User } from "lucide-react"
import Modal from "@/components/modal"
import { UserLogin } from "@/types/auth"
import { getUserRole, logout } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import type { WaStatus, WaStatusResponse } from "@/types/whatsapp"

export default function AppHeader() {
  const router = useRouter()

  const [user, setUser] = useState<UserLogin | null>(null)
  const [modalPassword, setModalPassword] = useState(false)
  const [passwordLama, setPasswordLama] = useState("")
  const [passwordBaru, setPasswordBaru] = useState("")
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("")
  const [saving, setSaving] = useState(false)

  const [waStatus, setWaStatus] = useState<WaStatus | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const userStorage = localStorage.getItem("user_admin")

    if (userStorage) {
      setUser(JSON.parse(userStorage))
    }
  }, [])

  useEffect(() => {
    const loadWaStatus = async () => {
      try {
        const res: { data: WaStatusResponse } = await apiFetch("/wa/status")
        setWaStatus(res.data.status)
      } catch {
        setWaStatus(null)
      }
    }

    loadWaStatus()
    const interval = setInterval(loadWaStatus, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    router.push("/login")
  }

  const openUbahPassword = () => {
    setMenuOpen(false)
    setPasswordLama("")
    setPasswordBaru("")
    setKonfirmasiPassword("")
    setModalPassword(true)
  }

  const submitUbahPassword = async () => {
    if (!passwordLama || !passwordBaru || !konfirmasiPassword) {
      Swal.fire("Belum lengkap", "Semua field wajib diisi.", "warning")
      return
    }

    if (passwordBaru !== konfirmasiPassword) {
      Swal.fire("Gagal", "Konfirmasi password baru tidak sama.", "warning")
      return
    }

    try {
      setSaving(true)

      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          password_lama: passwordLama,
          password_baru: passwordBaru,
          konfirmasi_password: konfirmasiPassword,
        }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: "Password berhasil diubah",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      })

      setModalPassword(false)
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  const initial = (user?.nama_lengkap || user?.username || "?").trim().charAt(0).toUpperCase()

  return (
    <header className="h-16 bg-black border-b border-slate-800 px-6 flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-white">Admin Sakuci</h1>
        <p className="text-xs text-slate-400">Panel Administrasi Sekolah</p>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5"
          title={waStatus === "ready" ? "Server WhatsApp Terhubung" : "Server WhatsApp Tidak Terhubung"}
        >
          <span
            className={
              waStatus === "ready"
                ? "h-2.5 w-2.5 animate-pulse rounded-full bg-green-500"
                : "h-2.5 w-2.5 rounded-full bg-slate-500"
            }
          />
          <span className="text-xs font-medium text-slate-300">WhatsApp {waStatus === "ready" ? "Online" : "Offline"}</span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 py-1 pl-1 pr-3 text-white hover:bg-slate-800 transition"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
              {initial}
            </span>
            <ChevronDown size={16} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
              <div className="border-b border-slate-100 px-4 py-2">
                <p className="font-medium text-slate-800">{user?.nama_lengkap || user?.username}</p>
                <p className="text-xs capitalize text-slate-500">{getUserRole(user) || "-"}</p>
              </div>

              <button
                onClick={openUbahPassword}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
              >
                <KeyRound size={16} />
                Ubah Password
              </button>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {modalPassword && (
        <Modal title="Ubah Password" onClose={() => setModalPassword(false)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Password Lama</label>
              <input
                type="password"
                value={passwordLama}
                onChange={(e) => setPasswordLama(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Password Baru</label>
              <input
                type="password"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                autoComplete="new-password"
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Konfirmasi Password Baru</label>
              <input
                type="password"
                value={konfirmasiPassword}
                onChange={(e) => setKonfirmasiPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <button
              onClick={submitUbahPassword}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </Modal>
      )}
    </header>
  )
}
