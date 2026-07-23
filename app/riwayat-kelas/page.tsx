"use client"

import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import { ArrowUpCircle, Eye, Loader2, Plus, Printer, Search, Trash2, UserPlus } from "lucide-react"
import AppShell from "@/components/app-shell"
import Modal from "@/components/modal"
import SortableTh from "@/components/sortable-th"
import { apiFetch } from "@/lib/api"
import { useSort } from "@/lib/use-sort"

type SiswaPpdbRef = {
  id_siswa: string
  nama_lengkap: string | null
  nisn: string | null
  status: string | null
  jenkel: "l" | "p" | null
}

type Riwayat = {
  id_riwayat: string
  id_siswa: string
  tahun_ajaran: string
  tingkat: string
  nama_kelas: string
  created_at?: string
  siswa_ppdb?: SiswaPpdbRef
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const printDaftarSiswa = (namaKelas: string, tingkat: string, tahunAjaran: string, rows: Riwayat[]) => {
  const sorted = [...rows].sort((a, b) =>
    (a.siswa_ppdb?.nama_lengkap || "").localeCompare(b.siswa_ppdb?.nama_lengkap || "")
  )

  const totalL = sorted.filter((r) => r.siswa_ppdb?.jenkel === "l").length
  const totalP = sorted.filter((r) => r.siswa_ppdb?.jenkel === "p").length

  const rowsHtml = sorted
    .map((r, i) => {
      const jenkel = r.siswa_ppdb?.jenkel === "l" ? "L" : r.siswa_ppdb?.jenkel === "p" ? "P" : "-"

      return `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${escapeHtml(r.siswa_ppdb?.nama_lengkap || "-")}</td>
          <td style="text-align:center">${jenkel}</td>
          <td>${escapeHtml(r.siswa_ppdb?.nisn || "-")}</td>
        </tr>
      `
    })
    .join("")

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Daftar Siswa ${escapeHtml(namaKelas)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; padding: 10mm; color: #0f172a; }
          h1 { font-size: 15px; margin: 0 0 2px; }
          p.sub { margin: 0 0 8px; color: #475569; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 2px 6px; font-size: 11px; line-height: 1.3; }
          th { background: #f1f5f9; text-align: left; }
          .recap { margin-top: 8px; font-size: 11px; display: flex; gap: 20px; }
          @page { size: A4; margin: 10mm; }
        </style>
      </head>
      <body>
        <h1>Daftar Siswa Kelas ${escapeHtml(namaKelas)}</h1>
        <p class="sub">Tingkat ${escapeHtml(tingkat)} &ndash; Tahun Ajaran ${escapeHtml(tahunAjaran)}</p>

        <table>
          <thead>
            <tr>
              <th style="width:32px;text-align:center">No</th>
              <th>Nama</th>
              <th style="width:80px;text-align:center">Jenis Kelamin</th>
              <th style="width:120px">NISN</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="4" style="text-align:center;padding:10px;">Belum ada siswa</td></tr>`}
          </tbody>
        </table>

        <div class="recap">
          <div><b>Laki-laki (L):</b> ${totalL}</div>
          <div><b>Perempuan (P):</b> ${totalP}</div>
          <div><b>Total:</b> ${sorted.length}</div>
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

export default function RiwayatKelasPage() {
  const [daftarTahun, setDaftarTahun] = useState<string[]>([])
  const [tahunAjaran, setTahunAjaran] = useState("")
  const [data, setData] = useState<Riwayat[]>([])
  const [loading, setLoading] = useState(true)

  const [modalNaikKelas, setModalNaikKelas] = useState(false)
  const [modalKelasBaru, setModalKelasBaru] = useState(false)
  const [detailKelas, setDetailKelas] = useState<{ namaKelas: string; tingkat: string } | null>(null)
  // Antrean kelas baru yang dibuat sekaligus (mis. tingkat 10, PPLG 1-4) -
  // ditampilkan satu per satu lewat ModalDetailKelas yang sama, lanjut ke
  // kelas berikutnya begitu satu kelas selesai/ditutup.
  const [kelasBaruQueue, setKelasBaruQueue] = useState<{ namaKelas: string; tingkat: string }[]>([])

  const closeDetailKelas = () => {
    if (kelasBaruQueue.length > 0) {
      const [next, ...rest] = kelasBaruQueue
      setKelasBaruQueue(rest)
      setDetailKelas(next)
    } else {
      setDetailKelas(null)
    }
  }

  const loadTahun = async () => {
    try {
      const [aktifRes, listRes] = await Promise.all([
        apiFetch("/riwayat-kelas/tahun-aktif"),
        apiFetch("/riwayat-kelas/tahun-list"),
      ])

      const list: string[] = Array.isArray(listRes.data) ? listRes.data.filter(Boolean) : []
      setDaftarTahun(list)

      const aktif = aktifRes.data?.tahun_ajaran
      setTahunAjaran(aktif || list[0] || "")
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const fetchRiwayat = async (ta: string) => {
    if (!ta) {
      setData([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await apiFetch(`/riwayat-kelas/tahun?tahun_ajaran=${encodeURIComponent(ta)}`)
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTahun()
  }, [])

  useEffect(() => {
    fetchRiwayat(tahunAjaran)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaran])

  const hapusRiwayat = async (item: Riwayat) => {
    const confirm = await Swal.fire({
      title: "Hapus Riwayat?",
      text: `Riwayat kelas ${item.siswa_ppdb?.nama_lengkap || ""} tahun ajaran ${item.tahun_ajaran} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/riwayat-kelas/${item.id_riwayat}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "Riwayat kelas berhasil dihapus",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      fetchRiwayat(tahunAjaran)
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const grouped = data.reduce<Record<string, Riwayat[]>>((acc, item) => {
    const key = `${item.nama_kelas || "-"}__${item.tingkat || "-"}`
    acc[key] = acc[key] || []
    acc[key].push(item)
    return acc
  }, {})

  const kelasSummary = Object.values(grouped).map((rows) => ({
    namaKelas: rows[0]?.nama_kelas || "-",
    tingkat: rows[0]?.tingkat || "",
    jumlah: rows.length,
  }))

  const { sorted: sortedKelasSummary, sortKey, sortDir, toggleSort } = useSort(
    kelasSummary,
    (row, key) => {
      switch (key) {
        case "nama_kelas":
          return row.namaKelas
        case "tingkat":
          return row.tingkat
        case "jumlah":
          return row.jumlah
        default:
          return null
      }
    }
  )

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengaturan Kelas</h1>
          <p className="text-sm text-slate-500">Riwayat kelas & kenaikan kelas siswa per tahun ajaran.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="">Pilih Tahun Ajaran</option>
            {daftarTahun.map((ta) => (
              <option key={ta} value={ta}>
                {ta}
              </option>
            ))}
          </select>

          <button
            onClick={() => setModalKelasBaru(true)}
            disabled={!tahunAjaran}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Plus size={16} />
            Kelas Baru
          </button>

          <button
            onClick={() => setModalNaikKelas(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <ArrowUpCircle size={16} />
            Proses Kenaikan Kelas
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-slate-600">
            <Loader2 className="animate-spin" size={22} />
            Memuat riwayat kelas...
          </div>
        ) : !tahunAjaran ? (
          <div className="p-10 text-center text-slate-500">
            Pilih tahun ajaran untuk melihat data.
          </div>
        ) : kelasSummary.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Belum ada data kelas untuk tahun ajaran {tahunAjaran}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <SortableTh label="Nama Kelas" sortKey="nama_kelas" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Tingkat" sortKey="tingkat" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Jumlah Siswa" sortKey="jumlah" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {sortedKelasSummary.map((item) => (
                  <tr key={`${item.namaKelas}-${item.tingkat}`} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.namaKelas}</td>
                    <td className="px-4 py-3">{item.tingkat}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.jumlah}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="mx-auto flex w-fit gap-2">
                        <button
                          onClick={() => setDetailKelas({ namaKelas: item.namaKelas, tingkat: item.tingkat })}
                          title="Lihat siswa"
                          className="flex items-center justify-center rounded-lg border border-slate-200 p-2 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          onClick={() =>
                            printDaftarSiswa(
                              item.namaKelas,
                              item.tingkat,
                              tahunAjaran,
                              grouped[`${item.namaKelas}__${item.tingkat}`] || []
                            )
                          }
                          title="Print daftar siswa"
                          className="flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalNaikKelas && (
        <ModalNaikKelas
          daftarTahun={daftarTahun}
          onClose={() => setModalNaikKelas(false)}
          onSuccess={() => {
            loadTahun()
          }}
        />
      )}

      {detailKelas && (
        <ModalDetailKelas
          tahunAjaran={tahunAjaran}
          namaKelas={detailKelas.namaKelas}
          tingkat={detailKelas.tingkat}
          sudahMasuk={grouped[`${detailKelas.namaKelas}__${detailKelas.tingkat}`] || []}
          sisaAntrean={kelasBaruQueue.length}
          onClose={closeDetailKelas}
          onHapus={hapusRiwayat}
          onAssigned={() => fetchRiwayat(tahunAjaran)}
        />
      )}

      {modalKelasBaru && (
        <ModalKelasBaru
          tahunAjaranAwal={tahunAjaran}
          daftarTahun={daftarTahun}
          onClose={() => setModalKelasBaru(false)}
          onCreate={(tahunAjaranBaru, classes) => {
            setModalKelasBaru(false)

            if (!daftarTahun.includes(tahunAjaranBaru)) {
              setDaftarTahun((prev) => [tahunAjaranBaru, ...prev].sort().reverse())
            }
            setTahunAjaran(tahunAjaranBaru)

            const [first, ...rest] = classes
            setKelasBaruQueue(rest)
            setDetailKelas(first)
          }}
        />
      )}
    </AppShell>
  )
}

function ModalKelasBaru({
  tahunAjaranAwal,
  daftarTahun,
  onClose,
  onCreate,
}: {
  tahunAjaranAwal: string
  daftarTahun: string[]
  onClose: () => void
  onCreate: (tahunAjaran: string, classes: { namaKelas: string; tingkat: string }[]) => void
}) {
  const [tahunAjaran, setTahunAjaran] = useState(tahunAjaranAwal)
  const [tingkat, setTingkat] = useState("")
  const [namaKelas, setNamaKelas] = useState("")
  const [bulk, setBulk] = useState(false)
  const [dari, setDari] = useState("1")
  const [sampai, setSampai] = useState("4")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedTahunAjaran = tahunAjaran.trim()
    const trimmedTingkat = tingkat.trim()
    const trimmedNama = namaKelas.trim()

    if (!trimmedTahunAjaran || !trimmedTingkat || !trimmedNama) {
      Swal.fire("Belum lengkap", "Tahun ajaran, tingkat, dan nama kelas wajib diisi.", "warning")
      return
    }

    if (!bulk) {
      onCreate(trimmedTahunAjaran, [{ namaKelas: trimmedNama, tingkat: trimmedTingkat }])
      return
    }

    const from = Number(dari)
    const to = Number(sampai)

    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
      Swal.fire("Belum lengkap", "Rentang nomor kelas tidak valid.", "warning")
      return
    }

    if (to - from + 1 > 50) {
      Swal.fire("Terlalu banyak", "Maksimal 50 kelas sekaligus.", "warning")
      return
    }

    const classes = Array.from({ length: to - from + 1 }, (_, i) => ({
      namaKelas: `${trimmedNama} ${from + i}`,
      tingkat: trimmedTingkat,
    }))

    onCreate(trimmedTahunAjaran, classes)
  }

  return (
    <Modal title="Buat Kelas Baru" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Tahun Ajaran</label>
          <input
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            list="tahun-ajaran-kelas-baru-options"
            placeholder="Contoh: 2027/2028"
            autoFocus
            className="w-full rounded-xl border px-4 py-2"
          />
          <datalist id="tahun-ajaran-kelas-baru-options">
            {daftarTahun.map((ta) => (
              <option key={ta} value={ta} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-500">
            Ketik tahun ajaran baru di sini kalau belum ada di daftar - akan otomatis dipakai begitu kelas
            ini dibuat.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Tingkat</label>
          <input
            value={tingkat}
            onChange={(e) => setTingkat(e.target.value)}
            placeholder="Contoh: 10"
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">
            {bulk ? "Nama Dasar Kelas" : "Nama Kelas"}
          </label>
          <input
            value={namaKelas}
            onChange={(e) => setNamaKelas(e.target.value)}
            placeholder={bulk ? "Contoh: PPLG" : "Contoh: PPLG 1"}
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={bulk}
            onChange={(e) => setBulk(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Buat beberapa kelas sekaligus (mis. PPLG 1 - PPLG 4)
        </label>

        {bulk && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Dari Nomor</label>
              <input
                type="number"
                min={1}
                value={dari}
                onChange={(e) => setDari(e.target.value)}
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Sampai Nomor</label>
              <input
                type="number"
                min={1}
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>
          </div>
        )}

        {bulk && namaKelas.trim() && (
          <p className="text-xs text-slate-500">
            Akan dibuat: {namaKelas.trim()} {dari} sampai {namaKelas.trim()} {sampai}
          </p>
        )}

        <p className="text-xs text-slate-500">
          Kelas akan langsung terbuka untuk mulai memasukkan siswa yang belum punya riwayat kelas di
          tahun ajaran ini.
        </p>

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Lanjutkan
        </button>
      </form>
    </Modal>
  )
}

function ModalNaikKelas({
  daftarTahun,
  onClose,
  onSuccess,
}: {
  daftarTahun: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const JENJANG_OPTIONS = [
    { value: "10-11", label: "Kelas 10 ke 11", asal: "10", tujuan: "11" },
    { value: "11-12", label: "Kelas 11 ke 12", asal: "11", tujuan: "12" },
  ] as const

  const [tahunAsal, setTahunAsal] = useState("")
  const [tahunTujuan, setTahunTujuan] = useState("")
  const [jenjang, setJenjang] = useState("")
  const [kelasAsal, setKelasAsal] = useState("")
  const [kelasTujuan, setKelasTujuan] = useState("")
  const [rawRows, setRawRows] = useState<Riwayat[]>([])
  const [promotedIds, setPromotedIds] = useState<Set<string>>(new Set())
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loadingAsal, setLoadingAsal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const jenjangOpt = JENJANG_OPTIONS.find((o) => o.value === jenjang)

  const loadAsal = async (ta: string) => {
    if (!ta) {
      setRawRows([])
      return
    }

    try {
      setLoadingAsal(true)
      const res = await apiFetch(`/riwayat-kelas/tahun?tahun_ajaran=${encodeURIComponent(ta)}`)
      setRawRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoadingAsal(false)
    }
  }

  const kelasAsalOptions = Array.from(
    new Set(rawRows.filter((item) => item.tingkat === jenjangOpt?.asal).map((item) => item.nama_kelas))
  ).sort()

  const siswaKelas = rawRows.filter(
    (item) =>
      item.tingkat === jenjangOpt?.asal &&
      item.nama_kelas === kelasAsal &&
      !promotedIds.has(item.id_siswa)
  )

  useEffect(() => {
    setChecked(Object.fromEntries(siswaKelas.map((item) => [item.id_siswa, true])))
    setKelasTujuan(kelasAsal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasAsal, jenjang, rawRows])

  const toggleCheck = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const checkedCount = siswaKelas.filter((item) => checked[item.id_siswa]).length

  const proses = async (mode: "terpilih" | "tanpa-acak") => {
    if (!tahunTujuan || !jenjangOpt || !kelasAsal) {
      Swal.fire("Belum lengkap", "Tahun ajaran tujuan, jenjang, dan kelas asal wajib diisi.", "warning")
      return
    }

    const targets = mode === "tanpa-acak" ? siswaKelas : siswaKelas.filter((item) => checked[item.id_siswa])
    const namaKelasTujuan = mode === "tanpa-acak" ? kelasAsal : kelasTujuan

    if (targets.length === 0) {
      Swal.fire("Belum lengkap", "Tidak ada siswa yang dipilih.", "warning")
      return
    }

    if (!namaKelasTujuan) {
      Swal.fire("Belum lengkap", "Kelas tujuan wajib diisi.", "warning")
      return
    }

    const confirm = await Swal.fire({
      title: "Proses Kenaikan Kelas?",
      text: `${targets.length} siswa dari kelas ${kelasAsal} akan naik ke kelas ${namaKelasTujuan} (tingkat ${jenjangOpt.tujuan}) tahun ajaran ${tahunTujuan}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Proses",
      cancelButtonText: "Batal",
    })

    if (!confirm.isConfirmed) return

    try {
      setSubmitting(true)

      const res = await apiFetch("/riwayat-kelas/naik-kelas", {
        method: "POST",
        body: JSON.stringify({
          tahun_ajaran: tahunTujuan,
          data: targets.map((item) => ({
            id_siswa: item.id_siswa,
            tingkat: jenjangOpt.tujuan,
            nama_kelas: namaKelasTujuan,
          })),
        }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: res.message || "Kenaikan kelas berhasil diproses",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      })

      setPromotedIds((prev) => {
        const next = new Set(prev)
        targets.forEach((item) => next.add(item.id_siswa))
        return next
      })

      onSuccess()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Proses Kenaikan Kelas" onClose={onClose} maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Tahun Ajaran Asal</label>
            <select
              value={tahunAsal}
              onChange={(e) => {
                setTahunAsal(e.target.value)
                setKelasAsal("")
                loadAsal(e.target.value)
              }}
              className="w-full rounded-xl border px-4 py-2"
            >
              <option value="">Pilih tahun ajaran</option>
              {daftarTahun.map((ta) => (
                <option key={ta} value={ta}>
                  {ta}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Jenjang Kenaikan</label>
            <select
              value={jenjang}
              onChange={(e) => {
                setJenjang(e.target.value)
                setKelasAsal("")
              }}
              className="w-full rounded-xl border px-4 py-2"
            >
              <option value="">Pilih jenjang</option>
              {JENJANG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Kelas Asal</label>
            <select
              value={kelasAsal}
              onChange={(e) => setKelasAsal(e.target.value)}
              disabled={!jenjangOpt || kelasAsalOptions.length === 0}
              className="w-full rounded-xl border px-4 py-2 disabled:bg-slate-100"
            >
              <option value="">Pilih kelas asal</option>
              {kelasAsalOptions.map((nama) => (
                <option key={nama} value={nama}>
                  {nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Tahun Ajaran Tujuan</label>
            <input
              value={tahunTujuan}
              onChange={(e) => setTahunTujuan(e.target.value)}
              placeholder="Contoh: 2026/2027"
              className="w-full rounded-xl border px-4 py-2"
            />
          </div>
        </div>

        {loadingAsal ? (
          <div className="flex items-center justify-center gap-3 p-8 text-slate-600">
            <Loader2 className="animate-spin" size={22} />
            Memuat data siswa...
          </div>
        ) : !kelasAsal ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Pilih tahun ajaran asal, jenjang, dan kelas asal untuk memuat daftar siswa.
          </div>
        ) : siswaKelas.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Semua siswa di kelas ini sudah diproses.
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm text-slate-600">
                Kelas Tujuan (untuk siswa yang dicentang)
              </label>
              <input
                value={kelasTujuan}
                onChange={(e) => setKelasTujuan(e.target.value)}
                placeholder="Contoh: PPLG 1"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <div className="max-h-[40vh] overflow-y-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checkedCount === siswaKelas.length}
                        onChange={(e) =>
                          setChecked(
                            Object.fromEntries(siswaKelas.map((item) => [item.id_siswa, e.target.checked]))
                          )
                        }
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Nama</th>
                    <th className="px-3 py-2 text-left">Tingkat Baru</th>
                  </tr>
                </thead>

                <tbody>
                  {siswaKelas.map((item) => (
                    <tr key={item.id_siswa} className="border-t">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!checked[item.id_siswa]}
                          onChange={() => toggleCheck(item.id_siswa)}
                        />
                      </td>
                      <td className="px-3 py-2">{item.siswa_ppdb?.nama_lengkap || item.id_siswa}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {jenjangOpt?.tujuan}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={() => proses("terpilih")}
                disabled={submitting || checkedCount === 0}
                className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Memproses..." : `Proses Siswa Terpilih (${checkedCount})`}
              </button>

              <button
                onClick={() => proses("tanpa-acak")}
                disabled={submitting || siswaKelas.length === 0}
                title="Naikkan seluruh siswa di kelas ini tanpa mengubah susunan/nama kelas"
                className="w-full rounded-xl bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "Memproses..." : `Tanpa Pengacakan (${siswaKelas.length} siswa)`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

type SiswaBelumKelas = {
  id_siswa: string
  nama_lengkap: string
  nisn: string | null
  jenkel: "l" | "p" | null
  siswa_baru?: {
    kelas_ppdb?: {
      nama_kelas: string
      tingkat: number | string
    } | null
  } | null
}

function ModalDetailKelas({
  tahunAjaran,
  namaKelas,
  tingkat,
  sudahMasuk,
  sisaAntrean = 0,
  onClose,
  onHapus,
  onAssigned,
}: {
  tahunAjaran: string
  namaKelas: string
  tingkat: string
  sudahMasuk: Riwayat[]
  sisaAntrean?: number
  onClose: () => void
  onHapus: (item: Riwayat) => void
  onAssigned: () => void
}) {
  const [tab, setTab] = useState<"sudah" | "belum">(sudahMasuk.length === 0 ? "belum" : "sudah")

  const [belumMasuk, setBelumMasuk] = useState<SiswaBelumKelas[]>([])
  const [loadingBelum, setLoadingBelum] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [filterKelasPpdb, setFilterKelasPpdb] = useState("")
  const [kelasPpdbOptions, setKelasPpdbOptions] = useState<
    { id_kelas: string; nama_kelas: string; tingkat: number | string }[]
  >([])
  const [filterTahunPpdb, setFilterTahunPpdb] = useState("")
  const [tahunPpdbOptions, setTahunPpdbOptions] = useState<
    { tahun: number | string }[]
  >([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAssigning, setBulkAssigning] = useState(false)

  const [selectedSudahIds, setSelectedSudahIds] = useState<Set<string>>(new Set())
  const [bulkHapusSudah, setBulkHapusSudah] = useState(false)

  useEffect(() => {
    setSelectedSudahIds(new Set())
  }, [sudahMasuk])

  useEffect(() => {
    apiFetch("/ppdb/masterppdb")
      .then((res) => setTahunPpdbOptions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTahunPpdbOptions([]))
  }, [])

  useEffect(() => {
    // Kalau tahun PPDB dipilih, kelas PPDB ikut disaring ke tahun itu saja
    // (lewat jurusan_ppdb -> master_ppdb) - tanpa filter tahun, tampilkan
    // semua kelas dari semua tahun.
    const endpoint = filterTahunPpdb
      ? `/ppdb/kelas?tahun=${filterTahunPpdb}`
      : "/kelas/data"

    apiFetch(endpoint)
      .then((res) => setKelasPpdbOptions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setKelasPpdbOptions([]))

    // Kelas yang lagi dipilih bisa jadi tidak ada di tahun PPDB yang baru -
    // reset supaya tidak nyangkut kombinasi filter yang sudah tidak valid.
    setFilterKelasPpdb("")
  }, [filterTahunPpdb])

  const fetchBelumMasuk = async () => {
    try {
      setLoadingBelum(true)

      const params = new URLSearchParams()
      params.set("tahun_ajaran", tahunAjaran)
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (search) params.set("search", search)
      if (filterKelasPpdb) params.set("id_kelas_ppdb", filterKelasPpdb)
      if (filterTahunPpdb) params.set("tahun", filterTahunPpdb)

      const res = await apiFetch(`/riwayat-kelas/belum-kelas?${params.toString()}`)

      setBelumMasuk(Array.isArray(res.data) ? res.data : [])
      setTotalPages(res.pagination?.total_pages || 1)
      setTotal(res.pagination?.total || 0)
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoadingBelum(false)
    }
  }

  useEffect(() => {
    if (tab === "belum") fetchBelumMasuk()
    setSelectedIds(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, limit, search, filterKelasPpdb, filterTahunPpdb])

  const toggleSelect = (id_siswa: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id_siswa)) next.delete(id_siswa)
      else next.add(id_siswa)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === belumMasuk.length
        ? new Set()
        : new Set(belumMasuk.map((s) => s.id_siswa))
    )
  }

  const assignBulk = async () => {
    const siswaTerpilih = belumMasuk.filter((s) => selectedIds.has(s.id_siswa))
    if (siswaTerpilih.length === 0) return

    const confirm = await Swal.fire({
      title: "Masukkan ke Kelas?",
      text: `${siswaTerpilih.length} siswa akan dimasukkan ke kelas ${namaKelas} tahun ajaran ${tahunAjaran}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Masukkan Semua",
      cancelButtonText: "Batal",
    })

    if (!confirm.isConfirmed) return

    try {
      setBulkAssigning(true)

      const hasil = await Promise.allSettled(
        siswaTerpilih.map((siswa) =>
          apiFetch("/riwayat-kelas", {
            method: "POST",
            body: JSON.stringify({
              id_siswa: siswa.id_siswa,
              tahun_ajaran: tahunAjaran,
              tingkat,
              nama_kelas: namaKelas,
            }),
          })
        )
      )

      const berhasil = hasil.filter((h) => h.status === "fulfilled").length
      const gagal = hasil.length - berhasil

      await Swal.fire({
        title: gagal === 0 ? "Berhasil" : "Sebagian Berhasil",
        text:
          gagal === 0
            ? `${berhasil} siswa berhasil dimasukkan ke kelas ${namaKelas}.`
            : `${berhasil} siswa berhasil, ${gagal} gagal dimasukkan.`,
        icon: gagal === 0 ? "success" : "warning",
      })

      setSelectedIds(new Set())
      onAssigned()
      fetchBelumMasuk()
    } finally {
      setBulkAssigning(false)
    }
  }

  const toggleSelectSudah = (id_riwayat: string) => {
    setSelectedSudahIds((prev) => {
      const next = new Set(prev)
      if (next.has(id_riwayat)) next.delete(id_riwayat)
      else next.add(id_riwayat)
      return next
    })
  }

  const toggleSelectAllSudah = () => {
    setSelectedSudahIds((prev) =>
      prev.size === sudahMasuk.length
        ? new Set()
        : new Set(sudahMasuk.map((r) => r.id_riwayat))
    )
  }

  const hapusBulkSudah = async () => {
    const terpilih = sudahMasuk.filter((r) => selectedSudahIds.has(r.id_riwayat))
    if (terpilih.length === 0) return

    const confirm = await Swal.fire({
      title: "Hapus dari Kelas?",
      text: `${terpilih.length} siswa akan dihapus dari kelas ${namaKelas}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus Semua",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      setBulkHapusSudah(true)

      const hasil = await Promise.allSettled(
        terpilih.map((item) =>
          apiFetch(`/riwayat-kelas/${item.id_riwayat}`, { method: "DELETE" })
        )
      )

      const berhasil = hasil.filter((h) => h.status === "fulfilled").length
      const gagal = hasil.length - berhasil

      await Swal.fire({
        title: gagal === 0 ? "Berhasil" : "Sebagian Berhasil",
        text:
          gagal === 0
            ? `${berhasil} siswa berhasil dihapus dari kelas ${namaKelas}.`
            : `${berhasil} siswa berhasil, ${gagal} gagal dihapus.`,
        icon: gagal === 0 ? "success" : "warning",
      })

      setSelectedSudahIds(new Set())
      onAssigned()
    } finally {
      setBulkHapusSudah(false)
    }
  }

  const assign = async (siswa: SiswaBelumKelas) => {
    const confirm = await Swal.fire({
      title: "Masukkan ke Kelas?",
      text: `${siswa.nama_lengkap} akan dimasukkan ke kelas ${namaKelas} tahun ajaran ${tahunAjaran}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Masukkan",
      cancelButtonText: "Batal",
    })

    if (!confirm.isConfirmed) return

    try {
      setAssigningId(siswa.id_siswa)

      await apiFetch("/riwayat-kelas", {
        method: "POST",
        body: JSON.stringify({
          id_siswa: siswa.id_siswa,
          tahun_ajaran: tahunAjaran,
          tingkat,
          nama_kelas: namaKelas,
        }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: `${siswa.nama_lengkap} berhasil dimasukkan ke kelas ${namaKelas}.`,
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      onAssigned()
      fetchBelumMasuk()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setAssigningId(null)
    }
  }

  return (
    <Modal
      title={`${namaKelas} - Tahun Ajaran ${tahunAjaran}`}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      {sisaAntrean > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <span>{sisaAntrean} kelas lagi menunggu dibuka dari pembuatan kelas sekaligus.</span>
          <button onClick={onClose} className="font-semibold underline">
            Lanjut ke Kelas Berikutnya
          </button>
        </div>
      )}

      <div className="mb-4 flex gap-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        <button
          onClick={() => setTab("sudah")}
          className={`flex-1 rounded-lg py-2 transition ${
            tab === "sudah" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
          }`}
        >
          Sudah Masuk Kelas ({sudahMasuk.length})
        </button>
        <button
          onClick={() => setTab("belum")}
          className={`flex-1 rounded-lg py-2 transition ${
            tab === "belum" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
          }`}
        >
          Belum Masuk Kelas
        </button>
      </div>

      {tab === "sudah" ? (
        sudahMasuk.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
            Belum ada siswa di kelas ini.
          </div>
        ) : (
          <div>
            {selectedSudahIds.size > 0 && (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-red-50 px-4 py-2">
                <span className="text-sm text-red-700">
                  {selectedSudahIds.size} siswa dipilih
                </span>

                <button
                  onClick={hapusBulkSudah}
                  disabled={bulkHapusSudah}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  {bulkHapusSudah
                    ? "Memproses..."
                    : `Hapus ${selectedSudahIds.size} Siswa`}
                </button>
              </div>
            )}

            <div className="max-h-[55vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="w-10 px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedSudahIds.size === sudahMasuk.length}
                        onChange={toggleSelectAllSudah}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Nama</th>
                    <th className="px-3 py-2 text-left">NISN</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {sudahMasuk.map((item) => (
                    <tr key={item.id_riwayat} className="border-t">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedSudahIds.has(item.id_riwayat)}
                          onChange={() => toggleSelectSudah(item.id_riwayat)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2">{item.siswa_ppdb?.nama_lengkap || item.id_siswa}</td>
                      <td className="px-3 py-2">{item.siswa_ppdb?.nisn || "-"}</td>
                      <td className="px-3 py-2 capitalize">{item.siswa_ppdb?.status || "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => onHapus(item)}
                          className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200"
                          title="Hapus dari kelas"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setPage(1)
                setSearch(searchInput)
              }}
              className="relative flex-1"
            >
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama/NISN..."
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none"
              />
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </form>

            <select
              value={filterTahunPpdb}
              onChange={(e) => {
                setPage(1)
                setFilterTahunPpdb(e.target.value)
              }}
              className="rounded-xl border border-slate-200 py-2 px-3 text-sm outline-none sm:w-40"
            >
              <option value="">Semua Tahun PPDB</option>
              {tahunPpdbOptions.map((item) => (
                <option key={item.tahun} value={item.tahun}>
                  {item.tahun}
                </option>
              ))}
            </select>

            <select
              value={filterKelasPpdb}
              onChange={(e) => {
                setPage(1)
                setFilterKelasPpdb(e.target.value)
              }}
              className="rounded-xl border border-slate-200 py-2 px-3 text-sm outline-none sm:w-56"
            >
              <option value="">Semua Kelas PPDB</option>
              {kelasPpdbOptions.map((kelas) => (
                <option key={kelas.id_kelas} value={kelas.id_kelas}>
                  {kelas.tingkat} {kelas.nama_kelas}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {total} siswa aktif belum punya kelas di tahun ajaran ini.
            </p>

            {selectedIds.size > 0 && (
              <button
                onClick={assignBulk}
                disabled={bulkAssigning}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <UserPlus size={14} />
                {bulkAssigning
                  ? "Memproses..."
                  : `Masukkan ${selectedIds.size} Siswa`}
              </button>
            )}
          </div>

          {loadingBelum ? (
            <div className="flex items-center justify-center gap-3 p-8 text-slate-600">
              <Loader2 className="animate-spin" size={22} />
              Memuat siswa...
            </div>
          ) : belumMasuk.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              Tidak ada siswa yang cocok.
            </div>
          ) : (
            <div className="max-h-[45vh] space-y-2 overflow-y-auto">
              <label className="flex items-center gap-2 px-1 text-xs font-medium text-slate-500">
                <input
                  type="checkbox"
                  checked={selectedIds.size === belumMasuk.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Pilih semua di halaman ini
              </label>

              {belumMasuk.map((siswa) => (
                <div
                  key={siswa.id_siswa}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(siswa.id_siswa)}
                      onChange={() => toggleSelect(siswa.id_siswa)}
                      className="h-4 w-4 rounded border-slate-300"
                    />

                    <div>
                      <div className="font-semibold text-slate-800">{siswa.nama_lengkap}</div>
                      <div className="text-xs text-slate-500">{siswa.nisn || "-"}</div>
                      <div className="text-xs text-slate-500">
                        Kelas PPDB:{" "}
                        {siswa.siswa_baru?.kelas_ppdb
                          ? `${siswa.siswa_baru.kelas_ppdb.tingkat} ${siswa.siswa_baru.kelas_ppdb.nama_kelas}`
                          : "-"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => assign(siswa)}
                    disabled={assigningId === siswa.id_siswa}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <UserPlus size={14} />
                    {assigningId === siswa.id_siswa ? "Memproses..." : "Masukkan"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loadingBelum && total > 0 && (
            <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <span>Tampilkan</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1)
                    setLimit(Number(e.target.value))
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  per halaman &middot; Halaman {page} dari {totalPages}
                </span>
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
        </div>
      )}
    </Modal>
  )
}
