"use client"

import { useEffect, useMemo, useState } from "react"
import Swal from "sweetalert2"
import { Edit, Eye, Loader2, Plus, Trash2, UserPlus } from "lucide-react"
import AppShell from "@/components/app-shell"
import Modal from "@/components/modal"
import InfoCard from "@/components/info-card"
import SortableTh from "@/components/sortable-th"
import { apiFetch } from "@/lib/api"
import { useSort } from "@/lib/use-sort"

type JurusanPpdb = {
  id_jurusan: string
  nama_jurusan: string
  id_ppdb?: string
  master_ppdb?: { id_ppdb: string; tahun: number }
}

type KelasPpdb = {
  id_kelas: string
  tingkat: number | string | null
  nama_kelas: string
  id_jurusan: string
  max: number
  jurusan_ppdb?: { id_jurusan?: string; nama_jurusan?: string }
}

type SiswaKelas = {
  id_siswa_baru: string
  id_siswa: string
  id_kelas: string
  siswa_ppdb?: {
    id_siswa: string
    nama_lengkap: string | null
    asal_sekolah: string | null
    no_hp: string | null
  }
}

type SiswaBelumKelas = {
  id_siswa: string
  nama_lengkap: string
  asal_sekolah: string | null
  minat_jurusan1: string | null
  siswa_baru: unknown
}

export default function KelasPpdbPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [kelas, setKelas] = useState<KelasPpdb[]>([])
  const [jurusan, setJurusan] = useState<JurusanPpdb[]>([])
  const [jumlahSiswa, setJumlahSiswa] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [modalSiswa, setModalSiswa] = useState(false)
  const [selectedKelas, setSelectedKelas] = useState<KelasPpdb | null>(null)
  const [siswaKelas, setSiswaKelas] = useState<SiswaKelas[]>([])
  const [loadingSiswa, setLoadingSiswa] = useState(false)

  const [modalTambahSiswa, setModalTambahSiswa] = useState(false)
  const [siswaBelumKelas, setSiswaBelumKelas] = useState<SiswaBelumKelas[]>([])
  const [loadingBelumKelas, setLoadingBelumKelas] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const [modalFormKelas, setModalFormKelas] = useState(false)
  const [modeForm, setModeForm] = useState<"tambah" | "edit">("tambah")
  const [kelasEdit, setKelasEdit] = useState<KelasPpdb | null>(null)

  const fetchKelas = async () => {
    try {
      setLoading(true)

      const [kelasRes, jurusanRes] = await Promise.all([
        apiFetch(`/ppdb/kelas?tahun=${tahun}`),
        apiFetch("/ppdb/jurusan"),
      ])

      const dataKelas: KelasPpdb[] = Array.isArray(kelasRes.data) ? kelasRes.data : []
      const dataJurusan: JurusanPpdb[] = Array.isArray(jurusanRes.data) ? jurusanRes.data : []

      const jurusanTahunAktif = dataJurusan.filter((item) => {
        if (!item.master_ppdb?.tahun) return true
        return Number(item.master_ppdb.tahun) === tahun
      })

      setKelas(dataKelas)
      setJurusan(jurusanTahunAktif)

      const result: Record<string, number> = {}

      await Promise.all(
        dataKelas.map(async (item) => {
          const countRes = await apiFetch(`/ppdb/hitungsiswa/${item.id_kelas}`)
          result[item.id_kelas] = Number(countRes.data || 0)
        })
      )

      setJumlahSiswa(result)
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKelas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun])

  const filteredKelas = useMemo(() => {
    const keyword = search.toLowerCase()

    return kelas.filter((item) => {
      return (
        item.nama_kelas.toLowerCase().includes(keyword) ||
        item.jurusan_ppdb?.nama_jurusan?.toLowerCase().includes(keyword)
      )
    })
  }, [kelas, search])

  const openSiswaKelas = async (item: KelasPpdb) => {
    try {
      setSelectedKelas(item)
      setModalSiswa(true)
      setLoadingSiswa(true)

      const res = await apiFetch(`/ppdb/siswakelas/${tahun}/${item.id_kelas}`)
      setSiswaKelas(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoadingSiswa(false)
    }
  }

  const openTambahSiswa = async () => {
    if (!selectedKelas) return

    try {
      setModalTambahSiswa(true)
      setLoadingBelumKelas(true)

      const res = await apiFetch(`/ppdb/siswa/${tahun}`)
      const semua: SiswaBelumKelas[] = Array.isArray(res.data) ? res.data : []

      setSiswaBelumKelas(semua.filter((s) => !s.siswa_baru))
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoadingBelumKelas(false)
    }
  }

  const assignSiswa = async (id_siswa: string) => {
    if (!selectedKelas) return

    try {
      setAssigningId(id_siswa)

      await apiFetch("/ppdb/postkelas", {
        method: "POST",
        body: JSON.stringify({ id_siswa, id_kelas: selectedKelas.id_kelas }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: "Siswa berhasil dimasukkan ke kelas",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      setModalTambahSiswa(false)
      openSiswaKelas(selectedKelas)
      fetchKelas()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setAssigningId(null)
    }
  }

  const openTambahKelas = () => {
    setModeForm("tambah")
    setKelasEdit(null)
    setModalFormKelas(true)
  }

  const openEditKelas = (item: KelasPpdb) => {
    setModeForm("edit")
    setKelasEdit(item)
    setModalFormKelas(true)
  }

  const deleteKelas = async (item: KelasPpdb) => {
    const confirm = await Swal.fire({
      title: "Hapus Kelas?",
      text: `Kelas ${item.nama_kelas} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/ppdb/deletekelas/${item.id_kelas}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "Kelas berhasil dihapus",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      fetchKelas()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const hapusSiswaDariKelas = async (id_siswa: string) => {
    const confirm = await Swal.fire({
      title: "Hapus dari kelas?",
      text: "Siswa hanya dihapus dari kelas, bukan dihapus dari data PPDB.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/ppdb/deletekelassiswa/${id_siswa}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "Siswa berhasil dihapus dari kelas",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      if (selectedKelas) openSiswaKelas(selectedKelas)
      fetchKelas()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const tahunOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => now - 2 + i)
  }, [])

  const { sorted: sortedKelas, sortKey, sortDir, toggleSort } = useSort(filteredKelas, (row, key) => {
    const isi = jumlahSiswa[row.id_kelas] || 0

    switch (key) {
      case "nama_kelas":
        return row.nama_kelas
      case "jurusan":
        return row.jurusan_ppdb?.nama_jurusan || ""
      case "jumlah":
        return isi
      case "max":
        return Number(row.max)
      case "sisa":
        return Math.max(Number(row.max) - isi, 0)
      default:
        return null
    }
  })

  const {
    sorted: sortedSiswaKelas,
    sortKey: sortKeySiswa,
    sortDir: sortDirSiswa,
    toggleSort: toggleSortSiswa,
  } = useSort(siswaKelas, (row, key) => {
    switch (key) {
      case "nama":
        return row.siswa_ppdb?.nama_lengkap || ""
      case "asal_sekolah":
        return row.siswa_ppdb?.asal_sekolah || ""
      default:
        return null
    }
  })

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kelas PPDB {tahun}</h1>
          <p className="text-sm text-slate-500">
            Kelola kelas, kapasitas, dan siswa per kelas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            {tahunOptions.map((y) => (
              <option key={y} value={y}>
                PPDB {y}
              </option>
            ))}
          </select>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kelas..."
            autoComplete="off"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
          />

          <button
            onClick={openTambahKelas}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Tambah
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InfoCard title="Total Kelas" value={String(kelas.length)} />
        <InfoCard
          title="Total Siswa Masuk Kelas"
          value={String(Object.values(jumlahSiswa).reduce((a, b) => a + b, 0))}
        />
        <InfoCard
          title="Total Kapasitas"
          value={String(kelas.reduce((sum, item) => sum + Number(item.max), 0))}
        />
        <InfoCard
          title="Sisa Kuota"
          value={String(
            kelas.reduce((sum, item) => {
              const isi = jumlahSiswa[item.id_kelas] || 0
              return sum + Math.max(Number(item.max) - isi, 0)
            }, 0)
          )}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-slate-600">
            <Loader2 className="animate-spin" size={22} />
            Memuat kelas...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <SortableTh label="Nama Kelas" sortKey="nama_kelas" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Jurusan" sortKey="jurusan" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Jumlah Siswa" sortKey="jumlah" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <SortableTh label="Maksimal" sortKey="max" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <SortableTh label="Sisa" sortKey="sisa" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {sortedKelas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Data kelas tidak ditemukan
                    </td>
                  </tr>
                ) : (
                  sortedKelas.map((item) => {
                    const isi = jumlahSiswa[item.id_kelas] || 0
                    const sisa = Math.max(Number(item.max) - isi, 0)
                    const penuh = isi >= Number(item.max)

                    return (
                      <tr key={item.id_kelas} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{item.nama_kelas}</div>
                          <div className="text-xs text-slate-500">Tingkat {item.tingkat || "-"}</div>
                        </td>

                        <td className="px-4 py-3">{item.jurusan_ppdb?.nama_jurusan || "-"}</td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              penuh ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                            }`}
                          >
                            {isi}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">{item.max}</td>
                        <td className="px-4 py-3 text-center">{sisa}</td>

                        <td className="px-4 py-3">
                          <div className="mx-auto flex w-fit overflow-hidden rounded-xl border border-slate-200">
                            <button
                              onClick={() => openSiswaKelas(item)}
                              title="Lihat siswa"
                              className="border-r px-3 py-2 text-blue-600 hover:bg-blue-50"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() => openEditKelas(item)}
                              title="Edit kelas"
                              className="border-r px-3 py-2 text-amber-600 hover:bg-amber-50"
                            >
                              <Edit size={16} />
                            </button>

                            <button
                              onClick={() => deleteKelas(item)}
                              title="Hapus kelas"
                              className="px-3 py-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalSiswa && selectedKelas && (
        <Modal title={`Siswa Kelas ${selectedKelas.nama_kelas}`} onClose={() => setModalSiswa(false)} maxWidth="max-w-3xl">
          <div className="mb-4 flex justify-end">
            <button
              onClick={openTambahSiswa}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <UserPlus size={16} />
              Tambah Siswa
            </button>
          </div>

          {loadingSiswa ? (
            <div className="flex items-center justify-center gap-3 p-8 text-slate-600">
              <Loader2 className="animate-spin" size={22} />
              Memuat siswa...
            </div>
          ) : siswaKelas.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              Belum ada siswa di kelas ini.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <SortableTh label="Nama" sortKey="nama" activeKey={sortKeySiswa} dir={sortDirSiswa} onSort={toggleSortSiswa} className="py-2" />
                    <SortableTh label="Asal Sekolah" sortKey="asal_sekolah" activeKey={sortKeySiswa} dir={sortDirSiswa} onSort={toggleSortSiswa} className="py-2" />
                    <th className="px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedSiswaKelas.map((item) => (
                    <tr key={item.id_siswa_baru} className="border-b">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">
                          {item.siswa_ppdb?.nama_lengkap || "-"}
                        </div>
                        <div className="text-xs text-slate-500">{item.siswa_ppdb?.no_hp || "-"}</div>
                      </td>

                      <td className="px-3 py-2">{item.siswa_ppdb?.asal_sekolah || "-"}</td>

                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => hapusSiswaDariKelas(item.id_siswa)}
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
          )}
        </Modal>
      )}

      {modalTambahSiswa && selectedKelas && (
        <Modal title={`Tambah Siswa ke ${selectedKelas.nama_kelas}`} onClose={() => setModalTambahSiswa(false)}>
          {loadingBelumKelas ? (
            <div className="flex items-center justify-center gap-3 p-8 text-slate-600">
              <Loader2 className="animate-spin" size={22} />
              Memuat data...
            </div>
          ) : siswaBelumKelas.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              Semua siswa PPDB tahun {tahun} sudah masuk kelas.
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {siswaBelumKelas.map((item) => (
                <div
                  key={item.id_siswa}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{item.nama_lengkap}</div>
                    <div className="text-xs text-slate-500">{item.asal_sekolah || "-"}</div>
                  </div>

                  <button
                    onClick={() => assignSiswa(item.id_siswa)}
                    disabled={assigningId === item.id_siswa}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {assigningId === item.id_siswa ? "Memproses..." : "Masukkan"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {modalFormKelas && (
        <ModalFormKelas
          mode={modeForm}
          kelas={kelasEdit}
          jurusan={jurusan}
          onClose={() => setModalFormKelas(false)}
          onSuccess={() => {
            setModalFormKelas(false)
            fetchKelas()
          }}
        />
      )}
    </AppShell>
  )
}

function ModalFormKelas({
  mode,
  kelas,
  jurusan,
  onClose,
  onSuccess,
}: {
  mode: "tambah" | "edit"
  kelas: KelasPpdb | null
  jurusan: JurusanPpdb[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [namaKelas, setNamaKelas] = useState(kelas?.nama_kelas || "")
  const [tingkat, setTingkat] = useState(String(kelas?.tingkat || ""))
  const [max, setMax] = useState(String(kelas?.max || ""))
  const [idJurusan, setIdJurusan] = useState(kelas?.id_jurusan || "")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!namaKelas || !tingkat || !max || !idJurusan) {
      Swal.fire("Belum lengkap", "Semua field wajib diisi.", "warning")
      return
    }

    try {
      setLoading(true)

      const url = mode === "tambah" ? "/ppdb/createkelas" : `/ppdb/updatekelas/${kelas?.id_kelas}`
      const method = mode === "tambah" ? "POST" : "PUT"

      await apiFetch(url, {
        method,
        body: JSON.stringify({
          nama_kelas: namaKelas,
          tingkat: Number(tingkat),
          max: Number(max),
          id_jurusan: idJurusan,
        }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: mode === "tambah" ? "Kelas berhasil ditambahkan" : "Kelas berhasil diperbarui",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      onSuccess()
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={mode === "tambah" ? "Tambah Kelas" : "Edit Kelas"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Nama Kelas</label>
          <input
            value={namaKelas}
            onChange={(e) => setNamaKelas(e.target.value)}
            placeholder="Contoh: X PPLG 1"
            autoComplete="off"
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Tingkat</label>
          <input
            type="number"
            value={tingkat}
            onChange={(e) => setTingkat(e.target.value)}
            placeholder="Contoh: 10"
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Maksimal Siswa</label>
          <input
            type="number"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Contoh: 36"
            className="w-full rounded-xl border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Jurusan</label>
          <select
            value={idJurusan}
            onChange={(e) => setIdJurusan(e.target.value)}
            className="w-full rounded-xl border px-4 py-2"
          >
            <option value="">Pilih Jurusan</option>
            {jurusan.map((item) => (
              <option key={item.id_jurusan} value={item.id_jurusan}>
                {item.nama_jurusan}
              </option>
            ))}
          </select>

          {jurusan.length === 0 && (
            <p className="mt-1 text-xs text-red-500">
              Data jurusan kosong. Tambahkan jurusan dulu di Master PPDB.
            </p>
          )}
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan Kelas"}
        </button>
      </div>
    </Modal>
  )
}
