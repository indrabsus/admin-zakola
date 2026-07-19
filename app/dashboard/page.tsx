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
} from "lucide-react"

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
