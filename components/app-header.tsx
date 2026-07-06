"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"
import { KeyRound, LogOut } from "lucide-react"
import Modal from "@/components/modal"
import { UserLogin } from "@/types/auth"
import { getUserRole, logout } from "@/lib/auth"
import { apiFetch } from "@/lib/api"

export default function AppHeader() {
  const router = useRouter()

  const [user, setUser] = useState<UserLogin | null>(null)
  const [modalPassword, setModalPassword] = useState(false)
  const [passwordLama, setPasswordLama] = useState("")
  const [passwordBaru, setPasswordBaru] = useState("")
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const userStorage = localStorage.getItem("user_admin")

    if (userStorage) {
      setUser(JSON.parse(userStorage))
    }
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const openUbahPassword = () => {
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

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-slate-800">Admin Sakuci</h1>
        <p className="text-xs text-slate-500">Panel Administrasi Sekolah</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-medium text-slate-800">
            {user?.nama_lengkap || user?.username}
          </p>

          <p className="text-xs text-slate-500 capitalize">
            {getUserRole(user) || "-"}
          </p>
        </div>

        <button
          onClick={openUbahPassword}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
        >
          <KeyRound size={16} />
          Ubah Password
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 transition"
        >
          <LogOut size={16} />
          Logout
        </button>
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
