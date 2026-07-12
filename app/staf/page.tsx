"use client"

import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import { Edit, Loader2, MessageCircle, Plus, Printer, Trash2 } from "lucide-react"
import AppShell from "@/components/app-shell"
import Modal from "@/components/modal"
import SortableTh from "@/components/sortable-th"
import { apiFetch } from "@/lib/api"
import { useSort } from "@/lib/use-sort"
import type { WaStatus, WaStatusResponse } from "@/types/whatsapp"

type StafRole = "guru" | "tendik"

type StafItem = {
  id_data: string
  id_user: string
  nama_lengkap: string
  no_hp: string | null
  uid_fp: number | null
  role: StafRole
}

type AbsenItem = {
  id_absen: string
  waktu: string
  status: string
  keterangan: string | null
}

type RawStafRow = {
  id_data: string
  id_user: string
  nama_lengkap: string
  no_hp: string | null
  uid_fp: number | null
  user?: { id: string }
}

const roleLabel: Record<StafRole, string> = {
  guru: "Guru",
  tendik: "Tendik",
}

const ROLE_ID: Record<StafRole, string> = {
  guru: "6",
  tendik: "7",
}

const roleColor: Record<StafRole, string> = {
  guru: "bg-blue-100 text-blue-700",
  tendik: "bg-purple-100 text-purple-700",
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const STATUS_IZIN_LABEL: Record<string, string> = {
  "1": "DISPEN",
  "2": "SAKIT",
  "3": "IZIN",
}

const BATAS_TERLAMBAT_MENIT = 6 * 60 + 31 // 06:31

const formatJam = (tanggalWaktu: string) => {
  const [, jam] = tanggalWaktu.split(" ")
  return jam ? jam.slice(0, 5) : "-"
}

const jamKeMenit = (jam: string) => {
  const [h, m] = jam.split(":").map(Number)
  return h * 60 + m
}

const getWorkingDays = (year: number, month: number) => {
  const days: Date[] = []
  const jumlahHari = new Date(year, month, 0).getDate()

  for (let d = 1; d <= jumlahHari; d++) {
    const date = new Date(year, month - 1, d)
    const dow = date.getDay()
    if (dow !== 0 && dow !== 6) days.push(date)
  }

  return days
}

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const printKehadiranBulanan = (staf: StafItem, absen: AbsenItem[], year: number, month: number) => {
  const byDate: Record<string, AbsenItem[]> = {}

  absen.forEach((item) => {
    const key = item.waktu.slice(0, 10)
    byDate[key] = byDate[key] || []
    byDate[key].push(item)
  })

  const namaBulan = new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  const tanggalCetak = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })

  const rowsHtml = getWorkingDays(year, month)
    .map((date) => {
      const key = dateKey(date)
      const records = byDate[key] || []
      const izin = records.find((r) => STATUS_IZIN_LABEL[r.status])
      const catatan = records.find((r) => r.keterangan && r.keterangan.trim() !== "")?.keterangan || ""

      let datang = "-"
      let pulang = "-"
      let datangStyle = ""

      if (izin) {
        datang = STATUS_IZIN_LABEL[izin.status]
        pulang = STATUS_IZIN_LABEL[izin.status]
      } else {
        const masuk = records.filter((r) => r.status === "0").sort((a, b) => a.waktu.localeCompare(b.waktu))[0]
        const keluar = records.filter((r) => r.status === "4").sort((a, b) => b.waktu.localeCompare(a.waktu))[0]

        if (masuk) {
          datang = formatJam(masuk.waktu)
          if (jamKeMenit(datang) > BATAS_TERLAMBAT_MENIT) {
            datangStyle = "color:#dc2626;font-weight:bold"
          }
        }
        if (keluar) pulang = formatJam(keluar.waktu)
      }

      const tanggal = `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`
      const hari = date.toLocaleDateString("id-ID", { weekday: "long" })

      return `
        <tr>
          <td>${tanggal}</td>
          <td>${escapeHtml(hari)}</td>
          <td style="text-align:center;${datangStyle}">${escapeHtml(datang)}</td>
          <td style="text-align:center">${escapeHtml(pulang)}</td>
          <td>${escapeHtml(catatan)}</td>
        </tr>
      `
    })
    .join("")

  const logoUrl = `${window.location.origin}/logo.png`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Kehadiran ${escapeHtml(staf.nama_lengkap)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; padding: 12mm; color: #000; font-size: 12px; }
          .kop { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #000; padding-bottom: 8px; }
          .kop img { width: 68px; height: 68px; object-fit: contain; }
          .kop .teks { text-align: center; flex: 1; }
          .kop h2 { margin: 0; font-size: 15px; }
          .kop p { margin: 1px 0; font-size: 11px; }
          h1 { text-align: center; font-size: 15px; margin: 14px 0; text-decoration: underline; }
          .info { margin-bottom: 10px; font-size: 12px; }
          .info div { margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th, td { border: 1px solid #000; padding: 4px 8px; font-size: 11.5px; line-height: 1.3; }
          th { background: #e5e7eb; text-align: center; }
          .ttd { margin-top: 28px; width: 260px; margin-left: auto; text-align: center; font-size: 12px; }
          .ttd .spasi { height: 55px; }
          @page { size: A4; margin: 14mm; }
        </style>
      </head>
      <body>
        <div class="kop">
          <img src="${logoUrl}" />
          <div class="teks">
            <h2>YAYASAN PENDIDIKAN DAYANG SUMBI JAYA LESTARI</h2>
            <h2>SEKOLAH MENENGAH KEJURUAN (SMK) SANGKURIANG 1 CIMAHI</h2>
            <p>BIDANG STUDI KEAHLIAN BISNIS MANAJEMEN DAN TEKNOLOGI INFORMASI KOMUNIKASI</p>
            <p>Jl.Sangkuriang No.76 Telp. (022) 665117, Fax (022) 6626603 Cimahi 40511</p>
          </div>
        </div>

        <h1>Rekap Kehadiran ${roleLabel[staf.role]}</h1>

        <div class="info">
          <div>Nama : ${escapeHtml(staf.nama_lengkap)}</div>
          <div>Bulan : ${escapeHtml(namaBulan)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Hari</th>
              <th>Jam Datang</th>
              <th>Jam Pulang</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="5" style="text-align:center;padding:10px;">Tidak ada hari kerja pada bulan ini</td></tr>`}
          </tbody>
        </table>

        <div class="ttd">
          <div>Cimahi, ${tanggalCetak}</div>
          <div>Koordinator PKG</div>
          <div class="spasi"></div>
          <div><b>Moch Nafsir S.PdI</b></div>
        </div>
      </body>
    </html>
  `

  const printWindow = window.open("", "_blank")

  if (!printWindow) {
    Swal.fire("Gagal", "Popup diblokir browser. Izinkan popup untuk mencetak.", "warning")
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}

export default function StafPage() {
  const [data, setData] = useState<StafItem[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState<StafItem | null>(null)
  const [editNama, setEditNama] = useState("")
  const [editNoHp, setEditNoHp] = useState("")
  const [editUidFp, setEditUidFp] = useState("")
  const [saving, setSaving] = useState(false)

  const [modalTambah, setModalTambah] = useState(false)
  const emptyTambah = {
    nama_lengkap: "",
    nama_singkat: "",
    jenkel: "l" as "l" | "p",
    role: "guru" as StafRole,
    no_hp: "",
    uid_fp: "",
  }
  const [formTambah, setFormTambah] = useState(emptyTambah)

  const [printingId, setPrintingId] = useState<string | null>(null)
  const [bulanKehadiran, setBulanKehadiran] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null)
  const [modalKirimWa, setModalKirimWa] = useState(false)
  const [pesanWa, setPesanWa] = useState("")
  const [sendingWa, setSendingWa] = useState(false)
  const [sendProgress, setSendProgress] = useState({ done: 0, total: 0 })

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

      const [guruRes, tendikRes] = await Promise.all([apiFetch("/data/guru"), apiFetch("/data/tendik")])

      const mapItem = (item: RawStafRow, role: StafRole): StafItem => ({
        id_data: item.id_data,
        id_user: item.user?.id || item.id_user,
        nama_lengkap: item.nama_lengkap,
        no_hp: item.no_hp,
        uid_fp: item.uid_fp,
        role,
      })

      const guru: StafItem[] = (Array.isArray(guruRes.data) ? guruRes.data : []).map((item: RawStafRow) =>
        mapItem(item, "guru")
      )
      const tendik: StafItem[] = (Array.isArray(tendikRes.data) ? tendikRes.data : []).map((item: RawStafRow) =>
        mapItem(item, "tendik")
      )

      setData([...guru, ...tendik])
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openEdit = (item: StafItem) => {
    setEditing(item)
    setEditNama(item.nama_lengkap)
    setEditNoHp(item.no_hp || "")
    setEditUidFp(item.uid_fp != null ? String(item.uid_fp) : "")
  }

  const submitEdit = async () => {
    if (!editing) return

    if (!editNama) {
      Swal.fire("Belum lengkap", "Nama wajib diisi.", "warning")
      return
    }

    try {
      setSaving(true)

      await apiFetch(`/data/updateuser/${editing.id_data}`, {
        method: "PUT",
        body: JSON.stringify({
          nama_lengkap: editNama,
          no_hp: editNoHp || null,
          uid_fp: editUidFp ? Number(editUidFp) : null,
        }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: "Data staf berhasil diperbarui",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      setEditing(null)
      fetchData()
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  const openTambah = () => {
    setFormTambah(emptyTambah)
    setModalTambah(true)
  }

  const submitTambah = async () => {
    if (!formTambah.nama_lengkap || !formTambah.nama_singkat) {
      Swal.fire("Belum lengkap", "Nama lengkap dan nama singkat wajib diisi.", "warning")
      return
    }

    try {
      setSaving(true)

      const res = await apiFetch("/data/createuser", {
        method: "POST",
        body: JSON.stringify({
          nama_lengkap: formTambah.nama_lengkap,
          nama_singkat: formTambah.nama_singkat,
          jenkel: formTambah.jenkel,
          id_role: ROLE_ID[formTambah.role],
          no_hp: formTambah.no_hp || null,
          uid_fp: formTambah.uid_fp ? Number(formTambah.uid_fp) : null,
        }),
      })

      setModalTambah(false)

      await Swal.fire({
        title: "Berhasil",
        html: `
          <p>Staf berhasil ditambahkan.</p>
          <p class="mt-2 text-sm">Username: <b>${res.data?.user?.username || "-"}</b></p>
          <p class="text-sm">Password default: <b>123456</b></p>
        `,
        icon: "success",
      })

      fetchData()
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  const hapus = async (item: StafItem) => {
    const confirm = await Swal.fire({
      title: "Hapus Staf?",
      text: `Akun ${item.nama_lengkap} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/data/deleteuser/${item.id_user}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "Staf berhasil dihapus",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      fetchData()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const cetakKehadiran = async (item: StafItem) => {
    const [tahunStr, bulanStr] = bulanKehadiran.split("-")
    const tahun = Number(tahunStr)
    const bulan = Number(bulanStr)

    try {
      setPrintingId(item.id_user)
      const res = await apiFetch(`/presensi/absen-staf/${item.id_user}?bulan=${bulan}&tahun=${tahun}`)
      printKehadiranBulanan(item, Array.isArray(res.data) ? res.data : [], tahun, bulan)
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setPrintingId(null)
    }
  }

  const { sorted, sortKey, sortDir, toggleSort } = useSort(data, (row, key) => {
    switch (key) {
      case "nama_lengkap":
        return row.nama_lengkap
      case "role":
        return row.role
      case "no_hp":
        return row.no_hp
      case "uid_fp":
        return row.uid_fp
      default:
        return null
    }
  })

  const selectableIds = sorted.filter((s) => s.no_hp).map((s) => s.id_data)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectableIds))
  }

  const openKirimWa = () => {
    setPesanWa("")
    setModalKirimWa(true)
  }

  const kirimWa = async () => {
    if (!pesanWa.trim()) {
      Swal.fire({ icon: "warning", title: "Pesan Kosong", text: "Isi pesan terlebih dahulu." })
      return
    }

    const penerima = sorted.filter((s) => selected.has(s.id_data) && s.no_hp)

    setSendingWa(true)
    setSendProgress({ done: 0, total: penerima.length })

    const gagal: string[] = []

    for (const staf of penerima) {
      try {
        await apiFetch("/wa/kirim", {
          method: "POST",
          body: JSON.stringify({ nomor: staf.no_hp, pesan: pesanWa }),
        })
      } catch {
        gagal.push(staf.nama_lengkap)
      }

      setSendProgress((prev) => ({ ...prev, done: prev.done + 1 }))
      await new Promise((resolve) => setTimeout(resolve, 800))
    }

    setSendingWa(false)
    setModalKirimWa(false)
    setSelected(new Set())

    if (gagal.length === 0) {
      Swal.fire({
        icon: "success",
        title: "Terkirim",
        text: `Pesan berhasil dikirim ke ${penerima.length} staf.`,
      })
    } else {
      Swal.fire({
        icon: "warning",
        title: "Sebagian Gagal",
        html: `Terkirim ${penerima.length - gagal.length} dari ${penerima.length}.<br/>Gagal: ${gagal.join(", ")}`,
      })
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Staf</h1>
          <p className="text-sm text-slate-500">Daftar guru dan tenaga kependidikan (tendik).</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <button
            onClick={openTambah}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Tambah Staf
          </button>

          <button
            onClick={openKirimWa}
            disabled={selected.size === 0 || waStatus !== "ready"}
            title={
              waStatus !== "ready"
                ? "Server WhatsApp tidak terhubung"
                : selected.size === 0
                ? "Pilih minimal satu staf"
                : undefined
            }
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <MessageCircle size={16} />
            Kirim WA{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Bulan Kehadiran (untuk Print)</label>
            <input
              type="month"
              value={bulanKehadiran}
              onChange={(e) => setBulanKehadiran(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-slate-600">
            <Loader2 className="animate-spin" size={22} />
            Memuat data...
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
                  <SortableTh label="Nama" sortKey="nama_lengkap" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Role" sortKey="role" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <SortableTh label="No HP" sortKey="no_hp" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="UID FP" sortKey="uid_fp" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Belum ada data staf
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => (
                    <tr key={item.id_data} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id_data)}
                          onChange={() => toggleSelect(item.id_data)}
                          disabled={!item.no_hp}
                          title={!item.no_hp ? "Tidak ada nomor HP" : undefined}
                          className="h-4 w-4 rounded border-slate-300 disabled:opacity-30"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.nama_lengkap}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleColor[item.role]}`}>
                          {roleLabel[item.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.no_hp || "-"}</td>
                      <td className="px-4 py-3 text-center">{item.uid_fp ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="mx-auto flex w-fit overflow-hidden rounded-xl border border-slate-200">
                          <button
                            onClick={() => cetakKehadiran(item)}
                            disabled={printingId === item.id_user}
                            title="Print Kehadiran"
                            className="border-r px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {printingId === item.id_user ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Printer size={16} />
                            )}
                          </button>

                          <button
                            onClick={() => openEdit(item)}
                            title="Edit"
                            className="border-r px-3 py-2 text-amber-600 hover:bg-amber-50"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => hapus(item)}
                            title="Hapus"
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
      </section>

      {editing && (
        <Modal title={`Edit Staf - ${editing.nama_lengkap}`} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Nama Lengkap</label>
              <input
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">No HP</label>
              <input
                value={editNoHp}
                onChange={(e) => setEditNoHp(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">UID FP</label>
              <input
                type="number"
                value={editUidFp}
                onChange={(e) => setEditUidFp(e.target.value)}
                placeholder="Contoh: 1001"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <button
              onClick={submitEdit}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </Modal>
      )}

      {modalTambah && (
        <Modal title="Tambah Staf" onClose={() => setModalTambah(false)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Nama Lengkap</label>
              <input
                value={formTambah.nama_lengkap}
                onChange={(e) => setFormTambah({ ...formTambah, nama_lengkap: e.target.value })}
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Nama Singkat</label>
              <input
                value={formTambah.nama_singkat}
                onChange={(e) => setFormTambah({ ...formTambah, nama_singkat: e.target.value })}
                placeholder="Contoh: Budi"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-slate-600">Jenis Kelamin</label>
                <select
                  value={formTambah.jenkel}
                  onChange={(e) => setFormTambah({ ...formTambah, jenkel: e.target.value as "l" | "p" })}
                  className="w-full rounded-xl border px-4 py-2"
                >
                  <option value="l">Laki-laki</option>
                  <option value="p">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Role</label>
                <select
                  value={formTambah.role}
                  onChange={(e) => setFormTambah({ ...formTambah, role: e.target.value as StafRole })}
                  className="w-full rounded-xl border px-4 py-2"
                >
                  <option value="guru">Guru</option>
                  <option value="tendik">Tendik</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">No HP</label>
              <input
                value={formTambah.no_hp}
                onChange={(e) => setFormTambah({ ...formTambah, no_hp: e.target.value })}
                placeholder="Contoh: 081234567890"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">UID FP</label>
              <input
                type="number"
                value={formTambah.uid_fp}
                onChange={(e) => setFormTambah({ ...formTambah, uid_fp: e.target.value })}
                placeholder="Contoh: 1001"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <p className="text-xs text-slate-500">
              Username dibuat otomatis dari nama, password default <b>123456</b>.
            </p>

            <button
              onClick={submitTambah}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </Modal>
      )}

      {modalKirimWa && (
        <Modal title="Kirim WhatsApp" onClose={() => !sendingWa && setModalKirimWa(false)}>
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm text-slate-600">Penerima ({selected.size})</p>
              <div className="max-h-28 overflow-y-auto rounded-xl border bg-slate-50 p-3 text-sm text-slate-600">
                {sorted
                  .filter((s) => selected.has(s.id_data))
                  .map((s) => s.nama_lengkap)
                  .join(", ")}
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
    </AppShell>
  )
}
