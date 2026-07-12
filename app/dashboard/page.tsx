"use client"

import { useEffect, useState } from "react"
import AppShell from "@/components/app-shell"
import InfoCard from "@/components/info-card"
import { apiFetch } from "@/lib/api"
import {
  Loader2,
  Users,
  School,
  ShieldCheck,
  UserCog,
  GraduationCap,
  UserCheck,
  MessageCircle,
} from "lucide-react"
import type { WaStatus, WaStatusResponse } from "@/types/whatsapp"

type Summary = {
  totalSiswa: number
  siswaAktif: number
  siswaPpdbTahunIni: number
  totalKelas: number
  totalUser: number
  totalRole: number
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null)

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
    const tahunIni = new Date().getFullYear()

    const load = async () => {
      try {
        setLoading(true)
        setError("")

        const [semua, aktif, ppdbTahunIni, kelas, user, role] = await Promise.all([
          apiFetch("/siswa/master?limit=1"),
          apiFetch("/siswa/master?limit=1&status=aktif"),
          apiFetch(`/siswa/master?limit=1&status=ppdb&tahun=${tahunIni}`),
          apiFetch("/ppdb/kelas"),
          apiFetch("/role/user"),
          apiFetch("/role/data"),
        ])

        setSummary({
          totalSiswa: semua.pagination?.total ?? 0,
          siswaAktif: aktif.pagination?.total ?? 0,
          siswaPpdbTahunIni: ppdbTahunIni.pagination?.total ?? 0,
          totalKelas: Array.isArray(kelas.data) ? kelas.data.length : 0,
          totalUser: Array.isArray(user.data) ? user.data.length : 0,
          totalRole: Array.isArray(role.data) ? role.data.length : 0,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Ringkasan data sekolah secara umum
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <MessageCircle size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-500">WhatsApp Bot</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800">
              {waStatus === "ready"
                ? "Server WhatsApp Terhubung"
                : waStatus === null
                ? "Memuat status..."
                : "Server WhatsApp Tidak Terhubung"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={
              waStatus === "ready"
                ? "h-3 w-3 animate-pulse rounded-full bg-green-500"
                : "h-3 w-3 rounded-full bg-slate-300"
            }
          />
          <span className="text-sm font-medium text-slate-500">
            {waStatus === "ready" ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-10">
          <Loader2 className="animate-spin" size={22} />
          Memuat dashboard...
        </div>
      ) : (
        summary && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <InfoCard
              title="Total Siswa"
              value={String(summary.totalSiswa)}
              icon={<Users size={22} />}
            />
            <InfoCard
              title="Siswa Aktif"
              value={String(summary.siswaAktif)}
              icon={<UserCheck size={22} />}
            />
            <InfoCard
              title={`Pendaftar PPDB ${new Date().getFullYear()}`}
              value={String(summary.siswaPpdbTahunIni)}
              icon={<GraduationCap size={22} />}
            />
            <InfoCard
              title="Total Kelas PPDB"
              value={String(summary.totalKelas)}
              icon={<School size={22} />}
            />
            <InfoCard
              title="Total User"
              value={String(summary.totalUser)}
              icon={<UserCog size={22} />}
            />
            <InfoCard
              title="Total Role"
              value={String(summary.totalRole)}
              icon={<ShieldCheck size={22} />}
            />
          </section>
        )
      )}
    </AppShell>
  )
}
