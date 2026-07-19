"use client"

import { useEffect, useMemo, useState } from "react"
import Swal from "sweetalert2"
import {
  AlertTriangle,
  CheckCircle2,
  Edit,
  Eye,
  Loader2,
  LogOut,
  MessageCircle,
  Move,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react"
import AppShell from "@/components/app-shell"
import Modal from "@/components/modal"
import SortableTh from "@/components/sortable-th"
import { apiFetch } from "@/lib/api"
import type { WaStatus, WaStatusResponse } from "@/types/whatsapp"

type KelasPpdb = {
  id_kelas: string
  nama_kelas: string
  tingkat: string | number
}

type SiswaBaru = {
  id_siswa_baru: string
  id_kelas: string
  kelas_ppdb?: KelasPpdb
}

type KelasPilihan = {
  id_kelas: string
  nama_kelas: string
  tingkat: string | number | null
  jurusan_ppdb?: { nama_jurusan?: string }
}

type KelasRiwayat = {
  tingkat: string
  nama_kelas: string
}

type RiwayatKelasSiswa = {
  id_riwayat: string
  tahun_ajaran: string
  tingkat: string
  nama_kelas: string
}

type Siswa = {
  id_siswa: string
  nama_lengkap: string
  nisn: string
  nik_siswa: string
  tempat_lahir: string | null
  tanggal_lahir: string | null
  jenkel: "l" | "p"
  agama: string
  alamat: string
  nama_ayah: string
  nama_ibu: string
  no_hp: string
  no_hp_ortu: string
  asal_sekolah: string
  minat_jurusan1: string
  minat_jurusan2: string
  tahun: number
  status: "aktif" | "nonaktif" | "keluar" | "ppdb"
  bayar_daftar: "y" | "n" | "l"
  username: string
  siswa_baru?: SiswaBaru | null
  riwayat_kelas?: RiwayatKelasSiswa[]
}

// Nilai sentinel untuk opsi "Belum Ada Kelas" di filter kelas - dipilih agar
// tidak mungkin bentrok dengan value asli "tingkat|nama_kelas".
const BELUM_KELAS_VALUE = "__belum_kelas__"

// Normalisasi kasar nomor HP Indonesia untuk indikator valid/tidak valid di
// tabel - bukan validasi ketat, cuma penanda cepat sebelum kirim WA.
const isValidNoHp = (value?: string | null) => {
  if (!value) return false
  const digits = value.replace(/[^0-9]/g, "")
  if (digits.startsWith("62")) return digits.length >= 10 && digits.length <= 15
  if (digits.startsWith("0")) return digits.length >= 9 && digits.length <= 14
  return false
}

const statusLabel: Record<string, string> = {
  aktif: "Aktif",
  nonaktif: "Non Aktif",
  keluar: "Keluar",
  ppdb: "PPDB",
}

const statusColor: Record<string, string> = {
  aktif: "bg-green-100 text-green-700",
  nonaktif: "bg-slate-200 text-slate-700",
  keluar: "bg-red-100 text-red-700",
  ppdb: "bg-blue-100 text-blue-700",
}

const emptyForm = {
  nama_lengkap: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  jenkel: "l" as "l" | "p",
  agama: "",
  alamat: "",
  nisn: "",
  nik_siswa: "",
  nama_ayah: "",
  nama_ibu: "",
  asal_sekolah: "",
  no_hp: "",
  status: "aktif" as Siswa["status"],
}

export default function SiswaPage() {
  const [data, setData] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [tahun, setTahun] = useState("")
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const [tahunAjaranList, setTahunAjaranList] = useState<string[]>([])
  const [tahunAjaranFilter, setTahunAjaranFilter] = useState("")
  const [kelasRiwayatList, setKelasRiwayatList] = useState<KelasRiwayat[]>([])
  const [kelasFilter, setKelasFilter] = useState("")

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalGantiStatus, setModalGantiStatus] = useState(false)
  const [statusBaru, setStatusBaru] = useState<Siswa["status"]>("aktif")
  const [savingBulk, setSavingBulk] = useState(false)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [sortBy, setSortBy] = useState("nama")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const toggleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<Siswa | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [editSiswa, setEditSiswa] = useState<Siswa | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [modalTambahManual, setModalTambahManual] = useState(false)

  const [waStatus, setWaStatus] = useState<WaStatus | null>(null)
  const [modalKirimWa, setModalKirimWa] = useState(false)
  const [targetWa, setTargetWa] = useState<"siswa" | "ortu">("siswa")
  const [pesanWa, setPesanWa] = useState("")
  const [sendingWa, setSendingWa] = useState(false)
  const [sendProgress, setSendProgress] = useState({ done: 0, total: 0 })

  const [editNoHp, setEditNoHp] = useState<{
    item: Siswa
    field: "no_hp" | "no_hp_ortu"
    label: string
  } | null>(null)
  const [noHpValue, setNoHpValue] = useState("")
  const [savingNoHp, setSavingNoHp] = useState(false)

  const [pindahKelasItem, setPindahKelasItem] = useState<Siswa | null>(null)

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

  const fetchData = async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      params.set("sort_by", sortBy)
      params.set("sort_dir", sortDir)
      if (tahun) params.set("tahun", tahun)
      if (status) params.set("status", status)
      if (search) params.set("search", search)
      if (tahunAjaranFilter) {
        params.set("tahun_ajaran", tahunAjaranFilter)
        if (kelasFilter === BELUM_KELAS_VALUE) {
          params.set("belum_kelas", "1")
        } else if (kelasFilter) {
          // value dropdown kelas berformat "tingkat|nama_kelas" - nama_kelas saja
          // bisa dipakai ulang di tingkat berbeda (mis. "MPLB 1" di tingkat 11
          // dan 12), jadi tingkat wajib disertakan supaya filter tidak
          // menyatukan siswa dari dua kelas yang beda tingkat.
          const separatorIndex = kelasFilter.indexOf("|")
          params.set("tingkat", kelasFilter.slice(0, separatorIndex))
          params.set("kelas", kelasFilter.slice(separatorIndex + 1))
        }
      }

      const res = await apiFetch(`/siswa/master?${params.toString()}`)

      setData(Array.isArray(res.data) ? res.data : [])
      setTotalPages(res.pagination?.total_pages || 1)
      setTotal(res.pagination?.total || 0)
      setSelected(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, tahun, status, search, sortBy, sortDir, kelasFilter, tahunAjaranFilter])

  useEffect(() => {
    const loadTahunAjaran = async () => {
      try {
        const [aktifRes, listRes] = await Promise.all([
          apiFetch("/riwayat-kelas/tahun-aktif"),
          apiFetch("/riwayat-kelas/tahun-list"),
        ])

        const list: string[] = Array.isArray(listRes.data) ? listRes.data : []
        setTahunAjaranList(list)
        setTahunAjaranFilter(aktifRes.data?.tahun_ajaran || list[0] || "")
      } catch {
        // biarkan kosong, filter kelas cukup tidak aktif kalau gagal dimuat
      }
    }

    loadTahunAjaran()
  }, [])

  useEffect(() => {
    const loadKelasRiwayat = async () => {
      if (!tahunAjaranFilter) {
        setKelasRiwayatList([])
        return
      }

      try {
        const res = await apiFetch(
          `/riwayat-kelas/kelas-list?tahun_ajaran=${encodeURIComponent(tahunAjaranFilter)}`
        )
        setKelasRiwayatList(Array.isArray(res.data) ? res.data : [])
      } catch {
        setKelasRiwayatList([])
      }
    }

    loadKelasRiwayat()
    setKelasFilter("")
  }, [tahunAjaranFilter])

  const openDetail = async (item: Siswa) => {
    try {
      setDetail(null)
      setDetailOpen(true)
      setLoadingDetail(true)

      const res = await apiFetch(`/data/detailsiswa/${item.id_siswa}`)
      setDetail(res.data)
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
      setDetailOpen(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const openEdit = (item: Siswa) => {
    setEditSiswa(item)
    setForm({
      nama_lengkap: item.nama_lengkap || "",
      tempat_lahir: item.tempat_lahir || "",
      tanggal_lahir: item.tanggal_lahir ? item.tanggal_lahir.slice(0, 10) : "",
      jenkel: item.jenkel || "l",
      agama: item.agama || "",
      alamat: item.alamat || "",
      nisn: item.nisn || "",
      nik_siswa: item.nik_siswa || "",
      nama_ayah: item.nama_ayah || "",
      nama_ibu: item.nama_ibu || "",
      asal_sekolah: item.asal_sekolah || "",
      no_hp: item.no_hp || "",
      status: item.status || "aktif",
    })
  }

  const submitEdit = async () => {
    if (!editSiswa) return

    try {
      setSaving(true)

      await apiFetch("/ppdb/updatesiswa", {
        method: "PUT",
        body: JSON.stringify({ id_siswa: editSiswa.id_siswa, ...form }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: "Data siswa berhasil diperbarui",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      setEditSiswa(null)
      fetchData()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  const hapusSiswa = async (item: Siswa) => {
    const confirm = await Swal.fire({
      title: "Hapus Siswa?",
      text: `Data ${item.nama_lengkap} akan dihapus permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch("/ppdb/deletesiswa", {
        method: "DELETE",
        body: JSON.stringify({ id_siswa: item.id_siswa }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: "Data siswa berhasil dihapus",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      fetchData()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const allSelected = data.length > 0 && data.every((item) => selected.has(item.id_siswa))

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(data.map((item) => item.id_siswa)))
  }

  const openGantiStatus = () => {
    setStatusBaru("aktif")
    setModalGantiStatus(true)
  }

  const submitGantiStatus = async () => {
    const ids = Array.from(selected)

    try {
      setSavingBulk(true)

      const results = await Promise.allSettled(
        ids.map((id_siswa) =>
          apiFetch("/ppdb/updatesiswa", {
            method: "PUT",
            body: JSON.stringify({ id_siswa, status: statusBaru }),
          })
        )
      )

      const gagal = results.filter((r) => r.status === "rejected").length

      setModalGantiStatus(false)

      if (gagal === 0) {
        await Swal.fire({
          title: "Berhasil",
          text: `Status ${ids.length} siswa berhasil diubah.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        await Swal.fire({
          title: "Sebagian Gagal",
          text: `${ids.length - gagal} dari ${ids.length} berhasil diubah, ${gagal} gagal.`,
          icon: "warning",
        })
      }

      fetchData()
    } finally {
      setSavingBulk(false)
    }
  }

  const hapusMassal = async () => {
    const ids = Array.from(selected)

    const confirm = await Swal.fire({
      title: "Hapus Siswa Terpilih?",
      text: `${ids.length} data siswa akan dihapus permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      setSavingBulk(true)

      const results = await Promise.allSettled(
        ids.map((id_siswa) =>
          apiFetch("/ppdb/deletesiswa", {
            method: "DELETE",
            body: JSON.stringify({ id_siswa }),
          })
        )
      )

      const gagal = results.filter((r) => r.status === "rejected").length

      if (gagal === 0) {
        await Swal.fire({
          title: "Berhasil",
          text: `${ids.length} data siswa berhasil dihapus.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        await Swal.fire({
          title: "Sebagian Gagal",
          text: `${ids.length - gagal} dari ${ids.length} berhasil dihapus, ${gagal} gagal.`,
          icon: "warning",
        })
      }

      fetchData()
    } finally {
      setSavingBulk(false)
    }
  }

  const openEditNoHp = (item: Siswa, field: "no_hp" | "no_hp_ortu", label: string) => {
    setEditNoHp({ item, field, label })
    setNoHpValue(item[field] || "")
  }

  const submitEditNoHp = async () => {
    if (!editNoHp) return

    try {
      setSavingNoHp(true)

      await apiFetch("/ppdb/updatesiswa", {
        method: "PUT",
        body: JSON.stringify({
          id_siswa: editNoHp.item.id_siswa,
          [editNoHp.field]: noHpValue.trim(),
        }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: `${editNoHp.label} berhasil diperbarui`,
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      setEditNoHp(null)
      fetchData()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSavingNoHp(false)
    }
  }

  const hapusNoHp = async () => {
    if (!editNoHp) return

    const confirm = await Swal.fire({
      title: "Hapus Nomor?",
      text: `${editNoHp.label} untuk ${editNoHp.item.nama_lengkap} akan dikosongkan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      setSavingNoHp(true)

      await apiFetch("/ppdb/updatesiswa", {
        method: "PUT",
        body: JSON.stringify({ id_siswa: editNoHp.item.id_siswa, [editNoHp.field]: "" }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: `${editNoHp.label} berhasil dihapus`,
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      setEditNoHp(null)
      fetchData()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSavingNoHp(false)
    }
  }

  const openKirimWa = () => {
    setTargetWa("siswa")
    setPesanWa("")
    setModalKirimWa(true)
  }

  const kirimWa = async () => {
    if (!pesanWa.trim()) {
      Swal.fire({ icon: "warning", title: "Pesan Kosong", text: "Isi pesan terlebih dahulu." })
      return
    }

    const terpilih = data.filter((item) => selected.has(item.id_siswa))
    const penerima = terpilih.filter((item) => isValidNoHp(targetWa === "siswa" ? item.no_hp : item.no_hp_ortu))

    if (penerima.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Tidak Ada Nomor Valid",
        text: `Tidak ada nomor WA ${targetWa === "siswa" ? "siswa" : "orang tua"} yang valid dari siswa terpilih.`,
      })
      return
    }

    setSendingWa(true)
    setSendProgress({ done: 0, total: penerima.length })

    const gagal: string[] = []

    for (const item of penerima) {
      try {
        await apiFetch("/wa/kirim", {
          method: "POST",
          body: JSON.stringify({
            nomor: targetWa === "siswa" ? item.no_hp : item.no_hp_ortu,
            pesan: pesanWa,
          }),
        })
      } catch {
        gagal.push(item.nama_lengkap)
      }

      setSendProgress((prev) => ({ ...prev, done: prev.done + 1 }))
      await new Promise((resolve) => setTimeout(resolve, 800))
    }

    setSendingWa(false)
    setModalKirimWa(false)
    setSelected(new Set())

    const dilewati = terpilih.length - penerima.length
    const dilewatiText = dilewati > 0 ? ` (${dilewati} dilewati karena nomor tidak valid)` : ""

    if (gagal.length === 0) {
      Swal.fire({
        icon: "success",
        title: "Terkirim",
        text: `Pesan berhasil dikirim ke ${penerima.length} penerima${dilewatiText}.`,
      })
    } else {
      Swal.fire({
        icon: "warning",
        title: "Sebagian Gagal",
        html: `Terkirim ${penerima.length - gagal.length} dari ${penerima.length}${dilewatiText}.<br/>Gagal: ${gagal.join(", ")}`,
      })
    }
  }

  const keluarkanDariKelas = async (item: Siswa) => {
    const current = item.riwayat_kelas?.[0]
    if (!current) return

    const confirm = await Swal.fire({
      title: "Keluarkan dari Kelas?",
      text: `${item.nama_lengkap} akan dikeluarkan dari kelas ${current.nama_kelas} (${current.tahun_ajaran}).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Keluarkan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/riwayat-kelas/${current.id_riwayat}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "Siswa berhasil dikeluarkan dari kelas.",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      fetchData()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const tahunOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, i) => now - 5 + i)
  }, [])

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Siswa</h1>
          <p className="text-sm text-slate-500">
            Direktori siswa ({total} data)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              setSearch(searchInput)
            }}
            className="flex flex-wrap gap-2"
          >
            <select
              value={tahun}
              onChange={(e) => {
                setPage(1)
                setTahun(e.target.value)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">Semua Tahun</option>
              {tahunOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">Semua Status</option>
              <option value="ppdb">PPDB</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non Aktif</option>
              <option value="keluar">Keluar</option>
            </select>

            <select
              value={tahunAjaranFilter}
              onChange={(e) => {
                setPage(1)
                setTahunAjaranFilter(e.target.value)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">Tahun Ajaran</option>
              {tahunAjaranList.map((ta) => (
                <option key={ta} value={ta}>
                  {ta}
                </option>
              ))}
            </select>

            <select
              value={kelasFilter}
              onChange={(e) => {
                setPage(1)
                setKelasFilter(e.target.value)
              }}
              disabled={!tahunAjaranFilter}
              title="Filter berdasarkan kelas terkini (riwayat kelas), bukan kelas PPDB"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none disabled:opacity-60"
            >
              <option value="">Semua Kelas</option>
              <option value={BELUM_KELAS_VALUE}>Belum Ada Kelas</option>
              {kelasRiwayatList.map((k) => (
                <option key={`${k.tingkat}-${k.nama_kelas}`} value={`${k.tingkat}|${k.nama_kelas}`}>
                  {k.nama_kelas} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>

            <div className="relative">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama/NISN/username..."
                autoComplete="off"
                className="rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none"
              />
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </form>

          <button
            onClick={openGantiStatus}
            disabled={selected.size === 0}
            title={selected.size === 0 ? "Pilih minimal satu siswa" : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Edit size={16} />
            Ganti Status{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>

          <button
            onClick={hapusMassal}
            disabled={selected.size === 0 || savingBulk}
            title={selected.size === 0 ? "Pilih minimal satu siswa" : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Trash2 size={16} />
            Hapus{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>

          <button
            onClick={openKirimWa}
            disabled={selected.size === 0 || waStatus !== "ready"}
            title={
              waStatus !== "ready"
                ? "Server WhatsApp tidak terhubung"
                : selected.size === 0
                ? "Pilih minimal satu siswa"
                : undefined
            }
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <MessageCircle size={16} />
            Kirim WA{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>

          <button
            onClick={() => setModalTambahManual(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <UserPlus size={16} />
            Tambah Siswa Manual
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-slate-600">
            <Loader2 className="animate-spin" size={22} />
            Memuat siswa...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <SortableTh label="Nama" sortKey="nama" activeKey={sortBy} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="NISN" sortKey="nisn" activeKey={sortBy} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Kelas" sortKey="kelas" activeKey={sortBy} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Kelas PPDB" sortKey="kelas_ppdb" activeKey={sortBy} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Tahun" sortKey="tahun" activeKey={sortBy} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Status" sortKey="status" activeKey={sortBy} dir={sortDir} onSort={toggleSort} align="center" />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      Data siswa tidak ditemukan
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id_siswa} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id_siswa)}
                          onChange={() => toggleSelect(item.id_siswa)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">
                          {item.nama_lengkap}
                        </div>
                        <div className="text-xs text-slate-500">{item.username}</div>

                        <div className="mt-1 space-y-0.5">
                          <NoHpRow
                            label="Siswa"
                            value={item.no_hp}
                            onClick={() => openEditNoHp(item, "no_hp", "No HP Siswa")}
                          />
                          <NoHpRow
                            label="Ortu"
                            value={item.no_hp_ortu}
                            onClick={() => openEditNoHp(item, "no_hp_ortu", "No HP Orang Tua")}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3">{item.nisn}</td>

                      <td className="px-4 py-3">
                        {item.riwayat_kelas?.[0]
                          ? `${item.riwayat_kelas[0].tingkat} ${item.riwayat_kelas[0].nama_kelas}`
                          : "-"}
                      </td>

                      <td className="px-4 py-3">{item.siswa_baru?.kelas_ppdb?.nama_kelas || "-"}</td>

                      <td className="px-4 py-3">{item.tahun}</td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            statusColor[item.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {statusLabel[item.status] || item.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="mx-auto flex w-fit overflow-hidden rounded-xl border border-slate-200">
                          <button
                            onClick={() => openDetail(item)}
                            title="Lihat detail"
                            className="border-r px-3 py-2 text-blue-600 hover:bg-blue-50"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => openEdit(item)}
                            title="Edit siswa"
                            className="border-r px-3 py-2 text-amber-600 hover:bg-amber-50"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => setPindahKelasItem(item)}
                            title="Pindah kelas"
                            className="border-r px-3 py-2 text-indigo-600 hover:bg-indigo-50"
                          >
                            <Move size={16} />
                          </button>

                          <button
                            onClick={() => keluarkanDariKelas(item)}
                            disabled={!item.riwayat_kelas?.[0]}
                            title={
                              item.riwayat_kelas?.[0]
                                ? "Keluarkan dari kelas"
                                : "Siswa belum masuk kelas di tahun ajaran ini"
                            }
                            className="border-r px-3 py-2 text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <LogOut size={16} />
                          </button>

                          <button
                            onClick={() => hapusSiswa(item)}
                            title="Hapus siswa"
                            className="px-3 py-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                {totalPages > 1 ? `Halaman ${page} dari ${totalPages}` : `${total} data`}
              </span>

              <select
                value={limit}
                onChange={(e) => {
                  setPage(1)
                  setLimit(Number(e.target.value))
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none"
              >
                {[20, 50, 100, 250, 500, 1000].map((n) => (
                  <option key={n} value={n}>
                    {n} / halaman
                  </option>
                ))}
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border px-3 py-1 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border px-3 py-1 disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {detailOpen && (
        <Modal title="Detail Siswa" onClose={() => setDetailOpen(false)} maxWidth="max-w-2xl">
          {loadingDetail || !detail ? (
            <div className="flex items-center justify-center gap-3 p-8 text-slate-600">
              <Loader2 className="animate-spin" size={22} />
              Memuat detail...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <Field label="Nama Lengkap" value={detail.nama_lengkap} />
              <Field label="NISN" value={detail.nisn} />
              <Field label="NIK" value={detail.nik_siswa} />
              <Field label="Jenis Kelamin" value={detail.jenkel === "l" ? "Laki-laki" : "Perempuan"} />
              <Field label="Tempat, Tanggal Lahir" value={`${detail.tempat_lahir || "-"}, ${detail.tanggal_lahir?.slice(0, 10) || "-"}`} />
              <Field label="Agama" value={detail.agama} />
              <Field label="Alamat" value={detail.alamat} full />
              <Field label="Nama Ayah" value={detail.nama_ayah} />
              <Field label="Nama Ibu" value={detail.nama_ibu} />
              <Field label="No HP" value={detail.no_hp} />
              <Field label="No HP Ortu" value={detail.no_hp_ortu} />
              <Field label="Asal Sekolah" value={detail.asal_sekolah} />
              <Field label="Minat Jurusan" value={`${detail.minat_jurusan1 || "-"} / ${detail.minat_jurusan2 || "-"}`} />
              <Field label="Tahun" value={String(detail.tahun || "-")} />
              <Field label="Status" value={statusLabel[detail.status] || detail.status} />
              <Field label="Username" value={detail.username} />
            </div>
          )}
        </Modal>
      )}

      {editSiswa && (
        <Modal title={`Edit Siswa - ${editSiswa.nama_lengkap}`} onClose={() => setEditSiswa(null)} maxWidth="max-w-2xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField label="Nama Lengkap" value={form.nama_lengkap} onChange={(v) => setForm({ ...form, nama_lengkap: v })} />
            <InputField label="NISN" value={form.nisn} onChange={(v) => setForm({ ...form, nisn: v })} />
            <InputField label="NIK" value={form.nik_siswa} onChange={(v) => setForm({ ...form, nik_siswa: v })} />
            <InputField label="Tempat Lahir" value={form.tempat_lahir} onChange={(v) => setForm({ ...form, tempat_lahir: v })} />
            <InputField label="Tanggal Lahir" type="date" value={form.tanggal_lahir} onChange={(v) => setForm({ ...form, tanggal_lahir: v })} />

            <div>
              <label className="mb-1 block text-sm text-slate-600">Jenis Kelamin</label>
              <select
                value={form.jenkel}
                onChange={(e) => setForm({ ...form, jenkel: e.target.value as "l" | "p" })}
                className="w-full rounded-xl border px-4 py-2"
              >
                <option value="l">Laki-laki</option>
                <option value="p">Perempuan</option>
              </select>
            </div>

            <InputField label="Agama" value={form.agama} onChange={(v) => setForm({ ...form, agama: v })} />
            <InputField label="Alamat" value={form.alamat} onChange={(v) => setForm({ ...form, alamat: v })} />
            <InputField label="Nama Ayah" value={form.nama_ayah} onChange={(v) => setForm({ ...form, nama_ayah: v })} />
            <InputField label="Nama Ibu" value={form.nama_ibu} onChange={(v) => setForm({ ...form, nama_ibu: v })} />
            <InputField label="No HP" value={form.no_hp} onChange={(v) => setForm({ ...form, no_hp: v })} />
            <InputField label="Asal Sekolah" value={form.asal_sekolah} onChange={(v) => setForm({ ...form, asal_sekolah: v })} />

            <div>
              <label className="mb-1 block text-sm text-slate-600">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Siswa["status"] })}
                className="w-full rounded-xl border px-4 py-2"
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Non Aktif</option>
                <option value="ppdb">PPDB</option>
                <option value="keluar">Keluar</option>
              </select>
            </div>
          </div>

          <button
            onClick={submitEdit}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </Modal>
      )}

      {modalTambahManual && (
        <ModalTambahManual
          defaultTahun={Number(tahun) || new Date().getFullYear()}
          onClose={() => setModalTambahManual(false)}
          onSuccess={() => {
            setModalTambahManual(false)
            fetchData()
          }}
        />
      )}

      {modalGantiStatus && (
        <Modal title={`Ganti Status (${selected.size} siswa)`} onClose={() => !savingBulk && setModalGantiStatus(false)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Status Baru</label>
              <select
                value={statusBaru}
                onChange={(e) => setStatusBaru(e.target.value as Siswa["status"])}
                disabled={savingBulk}
                className="w-full rounded-xl border px-4 py-2 disabled:opacity-60"
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Non Aktif</option>
                <option value="ppdb">PPDB</option>
                <option value="keluar">Keluar</option>
              </select>
            </div>

            <button
              onClick={submitGantiStatus}
              disabled={savingBulk}
              className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingBulk ? "Menyimpan..." : "Terapkan"}
            </button>
          </div>
        </Modal>
      )}

      {editNoHp && (
        <Modal
          title={`Edit ${editNoHp.label} - ${editNoHp.item.nama_lengkap}`}
          onClose={() => !savingNoHp && setEditNoHp(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">{editNoHp.label}</label>
              <input
                value={noHpValue}
                onChange={(e) => setNoHpValue(e.target.value)}
                placeholder="Contoh: 081234567890"
                disabled={savingNoHp}
                className="w-full rounded-xl border px-4 py-2 disabled:opacity-60"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitEditNoHp}
                disabled={savingNoHp}
                className="flex-1 rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingNoHp ? "Menyimpan..." : "Simpan"}
              </button>

              <button
                onClick={hapusNoHp}
                disabled={savingNoHp || !editNoHp.item[editNoHp.field]}
                title={!editNoHp.item[editNoHp.field] ? "Nomor sudah kosong" : undefined}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Trash2 size={16} />
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalKirimWa && (
        <Modal title="Kirim WhatsApp" onClose={() => !sendingWa && setModalKirimWa(false)}>
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm text-slate-600">Kirim Ke</p>
              <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setTargetWa("siswa")}
                  disabled={sendingWa}
                  className={`flex-1 rounded-lg py-2 transition ${
                    targetWa === "siswa" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setTargetWa("ortu")}
                  disabled={sendingWa}
                  className={`flex-1 rounded-lg py-2 transition ${
                    targetWa === "ortu" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Orang Tua
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm text-slate-600">Penerima ({selected.size} dipilih)</p>
              <div className="max-h-28 overflow-y-auto rounded-xl border bg-slate-50 p-3 text-sm text-slate-600">
                {data
                  .filter((item) => selected.has(item.id_siswa))
                  .map((item) => {
                    const nomor = targetWa === "siswa" ? item.no_hp : item.no_hp_ortu
                    const valid = isValidNoHp(nomor)
                    return (
                      <div key={item.id_siswa} className={valid ? "" : "text-red-500 line-through"}>
                        {item.nama_lengkap}
                        {!valid && " (nomor tidak valid)"}
                      </div>
                    )
                  })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Pesan</label>
              <textarea
                value={pesanWa}
                onChange={(e) => setPesanWa(e.target.value)}
                rows={5}
                disabled={sendingWa}
                placeholder="Tulis pesan yang akan dikirim..."
                className="w-full rounded-xl border px-4 py-2 disabled:opacity-60"
              />
            </div>

            <button
              onClick={kirimWa}
              disabled={sendingWa}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {sendingWa ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Mengirim {sendProgress.done}/{sendProgress.total}...
                </>
              ) : (
                <>
                  <MessageCircle size={16} />
                  Kirim
                </>
              )}
            </button>
          </div>
        </Modal>
      )}

      {pindahKelasItem && (
        <ModalPindahKelas
          siswa={pindahKelasItem}
          tahunAjaranList={tahunAjaranList}
          defaultTahunAjaran={tahunAjaranFilter}
          onClose={() => setPindahKelasItem(null)}
          onSuccess={() => {
            setPindahKelasItem(null)
            fetchData()
          }}
        />
      )}
    </AppShell>
  )
}

function NoHpRow({
  label,
  value,
  onClick,
}: {
  label: string
  value?: string | null
  onClick: () => void
}) {
  const valid = isValidNoHp(value)

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Klik untuk edit/hapus No HP ${label}`}
      className="flex w-full cursor-pointer items-center gap-1 text-left text-xs text-slate-500 hover:text-blue-600 hover:underline"
    >
      {valid ? (
        <CheckCircle2 size={12} className="shrink-0 fill-green-600 text-white" />
      ) : (
        <AlertTriangle size={12} className="shrink-0 text-red-500" />
      )}
      <span>
        {label}: {value || "-"}
      </span>
    </button>
  )
}

function Field({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value || "-"}</p>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-2"
      />
    </div>
  )
}

function ModalPindahKelas({
  siswa,
  tahunAjaranList,
  defaultTahunAjaran,
  onClose,
  onSuccess,
}: {
  siswa: Siswa
  tahunAjaranList: string[]
  defaultTahunAjaran: string
  onClose: () => void
  onSuccess: () => void
}) {
  const kelasSaatIni = siswa.riwayat_kelas?.[0]

  const [tahunAjaran, setTahunAjaran] = useState(defaultTahunAjaran || kelasSaatIni?.tahun_ajaran || "")
  const [tingkat, setTingkat] = useState(kelasSaatIni?.tingkat || "")
  const [namaKelas, setNamaKelas] = useState(kelasSaatIni?.nama_kelas || "")
  const [saving, setSaving] = useState(false)
  const [kelasOptions, setKelasOptions] = useState<KelasRiwayat[]>([])

  // Siswa yang belum punya kelas di tahun ajaran manapun mulai dengan
  // Tingkat/Nama Kelas kosong (tidak ada yang bisa diprefill dari
  // kelasSaatIni) - opsi ini dimuat supaya admin tinggal pilih dari kelas
  // yang sudah ada di tahun ajaran tersebut, bukan mengetik manual dari nol.
  useEffect(() => {
    const loadKelasOptions = async () => {
      if (!tahunAjaran.trim()) {
        setKelasOptions([])
        return
      }

      try {
        const res = await apiFetch(`/riwayat-kelas/kelas-list?tahun_ajaran=${encodeURIComponent(tahunAjaran.trim())}`)
        setKelasOptions(Array.isArray(res.data) ? res.data : [])
      } catch {
        setKelasOptions([])
      }
    }

    loadKelasOptions()
  }, [tahunAjaran])

  const submit = async () => {
    if (!tahunAjaran.trim() || !tingkat.trim() || !namaKelas.trim()) {
      Swal.fire("Belum lengkap", "Tahun ajaran, tingkat, dan nama kelas wajib diisi.", "warning")
      return
    }

    try {
      setSaving(true)

      await apiFetch("/riwayat-kelas/pindah", {
        method: "POST",
        body: JSON.stringify({
          id_siswa: siswa.id_siswa,
          tahun_ajaran: tahunAjaran.trim(),
          tingkat: tingkat.trim(),
          nama_kelas: namaKelas.trim(),
        }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: `${siswa.nama_lengkap} dipindahkan ke kelas ${namaKelas} (${tahunAjaran}).`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      })

      onSuccess()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Pindah Kelas - ${siswa.nama_lengkap}`} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">
        {kelasSaatIni && (
          <p className="rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-500">
            Kelas saat ini: <b>{kelasSaatIni.nama_kelas}</b> (Tingkat {kelasSaatIni.tingkat}) - {kelasSaatIni.tahun_ajaran}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm text-slate-600">Tahun Ajaran</label>
          <input
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            list="tahun-ajaran-options"
            placeholder="Contoh: 2026/2027"
            className="w-full rounded-xl border px-4 py-2"
          />
          <datalist id="tahun-ajaran-options">
            {tahunAjaranList.map((ta) => (
              <option key={ta} value={ta} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Tingkat</label>
          <input
            value={tingkat}
            onChange={(e) => setTingkat(e.target.value)}
            list="tingkat-options"
            placeholder="Contoh: 11"
            className="w-full rounded-xl border px-4 py-2"
          />
          <datalist id="tingkat-options">
            {Array.from(new Set(kelasOptions.map((k) => k.tingkat))).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Nama Kelas</label>
          <input
            value={namaKelas}
            onChange={(e) => setNamaKelas(e.target.value)}
            list="nama-kelas-options"
            placeholder="Contoh: PPLG 1"
            className="w-full rounded-xl border px-4 py-2"
          />
          <datalist id="nama-kelas-options">
            {kelasOptions
              .filter((k) => !tingkat.trim() || k.tingkat === tingkat.trim())
              .map((k) => (
                <option key={`${k.tingkat}-${k.nama_kelas}`} value={k.nama_kelas} />
              ))}
          </datalist>
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Move size={16} />
          {saving ? "Memindahkan..." : "Pindahkan"}
        </button>
      </div>
    </Modal>
  )
}

const emptyManualForm = {
  nama_lengkap: "",
  nisn: "",
  nik_siswa: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  jenkel: "l" as "l" | "p",
  agama: "",
  alamat: "",
  nama_ayah: "",
  nama_ibu: "",
  no_hp: "",
  no_hp_ortu: "",
  asal_sekolah: "",
  username: "",
  status: "aktif" as Siswa["status"],
}

function ModalTambahManual({
  defaultTahun,
  onClose,
  onSuccess,
}: {
  defaultTahun: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState(emptyManualForm)
  const [tahun, setTahun] = useState(String(defaultTahun))

  const [tahunKelas, setTahunKelas] = useState(defaultTahun)
  const [kelasList, setKelasList] = useState<KelasPilihan[]>([])
  const [idKelas, setIdKelas] = useState("")
  const [loadingKelas, setLoadingKelas] = useState(false)
  const [saving, setSaving] = useState(false)

  const tahunOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, i) => now - 5 + i)
  }, [])

  const fetchKelas = async (thn: number) => {
    try {
      setLoadingKelas(true)
      setIdKelas("")

      const res = await apiFetch(`/ppdb/kelas?tahun=${thn}`)
      setKelasList(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoadingKelas(false)
    }
  }

  useEffect(() => {
    fetchKelas(tahunKelas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunKelas])

  const suggestUsername = () => {
    const cleaned = form.nama_lengkap
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 10)

    if (!cleaned) {
      Swal.fire("Isi nama dulu", "Nama lengkap wajib diisi sebelum membuat username.", "warning")
      return
    }

    const random = Math.floor(100 + Math.random() * 900)
    setForm((f) => ({ ...f, username: `${random}${cleaned}` }))
  }

  const submit = async () => {
    const required: (keyof typeof form)[] = [
      "nama_lengkap",
      "nisn",
      "nik_siswa",
      "tanggal_lahir",
      "agama",
      "alamat",
      "nama_ayah",
      "nama_ibu",
      "no_hp",
      "no_hp_ortu",
      "asal_sekolah",
      "username",
    ]

    if (required.some((key) => !form[key]) || !tahun) {
      Swal.fire("Belum lengkap", "Semua field biodata wajib diisi.", "warning")
      return
    }

    if (!idKelas) {
      Swal.fire("Pilih Kelas", "Kelas PPDB wajib dipilih untuk siswa baru ini.", "warning")
      return
    }

    const kelasTerpilih = kelasList.find((k) => k.id_kelas === idKelas)
    const namaJurusan = kelasTerpilih?.jurusan_ppdb?.nama_jurusan || "-"

    try {
      setSaving(true)

      const created = await apiFetch("/ppdb/trfserver", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          tahun: Number(tahun),
          bayar_daftar: "y",
          minat_jurusan1: namaJurusan,
          minat_jurusan2: namaJurusan,
        }),
      })

      const idSiswa = created.data?.id_siswa

      let kelasBerhasil = true
      let pesanKelas = ""

      if (idSiswa) {
        try {
          await apiFetch("/ppdb/postkelas", {
            method: "POST",
            body: JSON.stringify({ id_siswa: idSiswa, id_kelas: idKelas }),
          })
        } catch (err) {
          kelasBerhasil = false
          pesanKelas = err instanceof Error ? err.message : "Terjadi kesalahan"
        }
      }

      if (kelasBerhasil) {
        await Swal.fire({
          title: "Berhasil",
          html: `
            <p>Siswa <b>${form.nama_lengkap}</b> berhasil ditambahkan dan dimasukkan ke kelas <b>${kelasTerpilih?.nama_kelas}</b>.</p>
            <p class="mt-2 text-sm">Username: <b>${form.username}</b> (password default sistem PPDB)</p>
          `,
          icon: "success",
        })
      } else {
        await Swal.fire({
          title: "Siswa Tersimpan, Kelas Gagal",
          html: `
            <p>Data siswa <b>${form.nama_lengkap}</b> berhasil disimpan, namun gagal dimasukkan ke kelas.</p>
            <p class="mt-2 text-sm">${pesanKelas}</p>
            <p class="mt-2 text-sm">Anda bisa memasukkan siswa ke kelas secara manual lewat menu Kelas PPDB.</p>
          `,
          icon: "warning",
        })
      }

      onSuccess()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Tambah Siswa Manual" onClose={onClose} maxWidth="max-w-2xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField label="Nama Lengkap" value={form.nama_lengkap} onChange={(v) => setForm({ ...form, nama_lengkap: v })} />
        <InputField label="NISN" value={form.nisn} onChange={(v) => setForm({ ...form, nisn: v })} />
        <InputField label="NIK" value={form.nik_siswa} onChange={(v) => setForm({ ...form, nik_siswa: v })} />
        <InputField label="Tempat Lahir" value={form.tempat_lahir} onChange={(v) => setForm({ ...form, tempat_lahir: v })} />
        <InputField label="Tanggal Lahir" type="date" value={form.tanggal_lahir} onChange={(v) => setForm({ ...form, tanggal_lahir: v })} />

        <div>
          <label className="mb-1 block text-sm text-slate-600">Jenis Kelamin</label>
          <select
            value={form.jenkel}
            onChange={(e) => setForm({ ...form, jenkel: e.target.value as "l" | "p" })}
            className="w-full rounded-xl border px-4 py-2"
          >
            <option value="l">Laki-laki</option>
            <option value="p">Perempuan</option>
          </select>
        </div>

        <InputField label="Agama" value={form.agama} onChange={(v) => setForm({ ...form, agama: v })} />
        <InputField label="Alamat" value={form.alamat} onChange={(v) => setForm({ ...form, alamat: v })} />
        <InputField label="Nama Ayah" value={form.nama_ayah} onChange={(v) => setForm({ ...form, nama_ayah: v })} />
        <InputField label="Nama Ibu" value={form.nama_ibu} onChange={(v) => setForm({ ...form, nama_ibu: v })} />
        <InputField label="No HP" value={form.no_hp} onChange={(v) => setForm({ ...form, no_hp: v })} />
        <InputField label="No HP Ortu" value={form.no_hp_ortu} onChange={(v) => setForm({ ...form, no_hp_ortu: v })} />
        <InputField label="Asal Sekolah" value={form.asal_sekolah} onChange={(v) => setForm({ ...form, asal_sekolah: v })} />

        <div>
          <label className="mb-1 block text-sm text-slate-600">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Siswa["status"] })}
            className="w-full rounded-xl border px-4 py-2"
          >
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non Aktif</option>
            <option value="ppdb">PPDB</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Tahun Masuk</label>
          <select
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="w-full rounded-xl border px-4 py-2"
          >
            {tahunOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-slate-600">Username</label>
          <div className="flex gap-2">
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Username akun siswa"
              autoComplete="off"
              className="w-full rounded-xl border px-4 py-2"
            />
            <button
              type="button"
              onClick={suggestUsername}
              className="shrink-0 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Buatkan
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        <h3 className="mb-3 font-semibold text-slate-800">Pilih Kelas PPDB</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Tahun PPDB</label>
            <select
              value={tahunKelas}
              onChange={(e) => setTahunKelas(Number(e.target.value))}
              className="w-full rounded-xl border px-4 py-2"
            >
              {tahunOptions.map((y) => (
                <option key={y} value={y}>
                  PPDB {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Kelas</label>
            <select
              value={idKelas}
              onChange={(e) => setIdKelas(e.target.value)}
              disabled={loadingKelas}
              className="w-full rounded-xl border px-4 py-2 disabled:opacity-60"
            >
              <option value="">
                {loadingKelas ? "Memuat kelas..." : "Pilih kelas"}
              </option>
              {kelasList.map((item) => (
                <option key={item.id_kelas} value={item.id_kelas}>
                  {item.nama_kelas} - {item.jurusan_ppdb?.nama_jurusan || "-"} (Tingkat {item.tingkat})
                </option>
              ))}
            </select>

            {!loadingKelas && kelasList.length === 0 && (
              <p className="mt-1 text-xs text-red-500">
                Belum ada kelas untuk tahun ini. Tambahkan kelas dulu di menu Kelas PPDB.
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? "Menyimpan..." : "Simpan & Masukkan ke Kelas"}
      </button>
    </Modal>
  )
}
