"use client"

import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import { Edit, Loader2, ListTree, Plus, Trash2 } from "lucide-react"
import AppShell from "@/components/app-shell"
import Modal from "@/components/modal"
import SortableTh from "@/components/sortable-th"
import { apiFetch } from "@/lib/api"
import { useSort } from "@/lib/use-sort"

type MasterPpdb = {
  id_ppdb: string
  daftar: number
  ppdb: number
  token_telegram: string
  chat_id: string
  tahun: number
  kode_akses: string
}

type Jurusan = {
  id_jurusan: string
  nama_jurusan: string
  id_ppdb: string
}

const rupiah = (angka: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(
    Number(angka) || 0
  )

export default function MasterPpdbPage() {
  const [data, setData] = useState<MasterPpdb[]>([])
  const [loading, setLoading] = useState(true)

  const [modalForm, setModalForm] = useState(false)
  const [mode, setMode] = useState<"tambah" | "edit">("tambah")
  const [editing, setEditing] = useState<MasterPpdb | null>(null)

  const [modalJurusan, setModalJurusan] = useState(false)
  const [selectedMaster, setSelectedMaster] = useState<MasterPpdb | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiFetch("/ppdb/masterppdb")
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openTambah = () => {
    setMode("tambah")
    setEditing(null)
    setModalForm(true)
  }

  const openEdit = (item: MasterPpdb) => {
    setMode("edit")
    setEditing(item)
    setModalForm(true)
  }

  const hapus = async (item: MasterPpdb) => {
    const confirm = await Swal.fire({
      title: "Hapus Master PPDB?",
      text: `Data PPDB tahun ${item.tahun} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/ppdb/deletemaster/${item.id_ppdb}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "Master PPDB berhasil dihapus",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      fetchData()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const { sorted, sortKey, sortDir, toggleSort } = useSort(data, (row, key) => {
    switch (key) {
      case "tahun":
        return row.tahun
      case "daftar":
        return Number(row.daftar)
      case "ppdb":
        return Number(row.ppdb)
      case "kode_akses":
        return row.kode_akses
      default:
        return null
    }
  })

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master PPDB</h1>
          <p className="text-sm text-slate-500">Pengaturan biaya & jurusan PPDB per tahun.</p>
        </div>

        <button
          onClick={openTambah}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Tambah Master PPDB
        </button>
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
                  <SortableTh label="Tahun" sortKey="tahun" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Biaya Daftar" sortKey="daftar" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortableTh label="Biaya PPDB" sortKey="ppdb" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortableTh label="Kode Akses" sortKey="kode_akses" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      Belum ada data Master PPDB
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => (
                    <tr key={item.id_ppdb} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.tahun}</td>
                      <td className="px-4 py-3 text-right">{rupiah(item.daftar)}</td>
                      <td className="px-4 py-3 text-right">{rupiah(item.ppdb)}</td>
                      <td className="px-4 py-3">{item.kode_akses}</td>
                      <td className="px-4 py-3">
                        <div className="mx-auto flex w-fit overflow-hidden rounded-xl border border-slate-200">
                          <button
                            onClick={() => {
                              setSelectedMaster(item)
                              setModalJurusan(true)
                            }}
                            title="Kelola jurusan"
                            className="border-r px-3 py-2 text-indigo-600 hover:bg-indigo-50"
                          >
                            <ListTree size={16} />
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

      {modalForm && (
        <ModalFormMaster
          mode={mode}
          data={editing}
          onClose={() => setModalForm(false)}
          onSuccess={() => {
            setModalForm(false)
            fetchData()
          }}
        />
      )}

      {modalJurusan && selectedMaster && (
        <ModalJurusan master={selectedMaster} onClose={() => setModalJurusan(false)} />
      )}
    </AppShell>
  )
}

function ModalFormMaster({
  mode,
  data,
  onClose,
  onSuccess,
}: {
  mode: "tambah" | "edit"
  data: MasterPpdb | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [tahun, setTahun] = useState(String(data?.tahun || new Date().getFullYear()))
  const [daftar, setDaftar] = useState(String(data?.daftar || ""))
  const [ppdb, setPpdb] = useState(String(data?.ppdb || ""))
  const [kodeAkses, setKodeAkses] = useState(data?.kode_akses || "")
  const [tokenTelegram, setTokenTelegram] = useState(data?.token_telegram || "")
  const [chatId, setChatId] = useState(data?.chat_id || "")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!tahun || !daftar || !ppdb || !kodeAkses) {
      Swal.fire("Belum lengkap", "Tahun, biaya daftar, biaya PPDB, dan kode akses wajib diisi.", "warning")
      return
    }

    try {
      setLoading(true)

      const body = {
        tahun: Number(tahun),
        daftar: Number(daftar),
        ppdb: Number(ppdb),
        kode_akses: kodeAkses,
        token_telegram: tokenTelegram,
        chat_id: chatId,
      }

      const url = mode === "tambah" ? "/ppdb/createmaster" : `/ppdb/updatemaster/${data?.id_ppdb}`
      const method = mode === "tambah" ? "POST" : "PUT"

      await apiFetch(url, { method, body: JSON.stringify(body) })

      await Swal.fire({
        title: "Berhasil",
        text: mode === "tambah" ? "Master PPDB berhasil ditambahkan" : "Master PPDB berhasil diperbarui",
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
    <Modal title={mode === "tambah" ? "Tambah Master PPDB" : "Edit Master PPDB"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Tahun</label>
          <input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} className="w-full rounded-xl border px-4 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Biaya Daftar (Rp)</label>
          <input type="number" value={daftar} onChange={(e) => setDaftar(e.target.value)} className="w-full rounded-xl border px-4 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Biaya PPDB (Rp)</label>
          <input type="number" value={ppdb} onChange={(e) => setPpdb(e.target.value)} className="w-full rounded-xl border px-4 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Kode Akses</label>
          <input value={kodeAkses} onChange={(e) => setKodeAkses(e.target.value)} className="w-full rounded-xl border px-4 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Token Telegram (opsional)</label>
          <input value={tokenTelegram} onChange={(e) => setTokenTelegram(e.target.value)} className="w-full rounded-xl border px-4 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Chat ID Telegram (opsional)</label>
          <input value={chatId} onChange={(e) => setChatId(e.target.value)} className="w-full rounded-xl border px-4 py-2" />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </Modal>
  )
}

function ModalJurusan({ master, onClose }: { master: MasterPpdb; onClose: () => void }) {
  const [jurusan, setJurusan] = useState<Jurusan[]>([])
  const [loading, setLoading] = useState(true)
  const [namaBaru, setNamaBaru] = useState("")
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNama, setEditingNama] = useState("")

  const fetchJurusan = async () => {
    try {
      setLoading(true)
      const res = await apiFetch("/ppdb/jurusan")
      const semua: Jurusan[] = Array.isArray(res.data) ? res.data : []
      setJurusan(semua.filter((j) => j.id_ppdb === master.id_ppdb))
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJurusan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tambah = async () => {
    if (!namaBaru) return

    try {
      setSaving(true)
      await apiFetch("/ppdb/createjurusan", {
        method: "POST",
        body: JSON.stringify({ nama_jurusan: namaBaru, id_ppdb: master.id_ppdb }),
      })
      setNamaBaru("")
      fetchJurusan()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  const simpanEdit = async (item: Jurusan) => {
    try {
      await apiFetch(`/ppdb/updatejurusan/${item.id_jurusan}`, {
        method: "PUT",
        body: JSON.stringify({ nama_jurusan: editingNama, id_ppdb: master.id_ppdb }),
      })
      setEditingId(null)
      fetchJurusan()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const hapus = async (item: Jurusan) => {
    const confirm = await Swal.fire({
      title: "Hapus Jurusan?",
      text: `Jurusan ${item.nama_jurusan} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/ppdb/deletejurusan/${item.id_jurusan}`, { method: "DELETE" })
      fetchJurusan()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  return (
    <Modal title={`Jurusan PPDB ${master.tahun}`} onClose={onClose}>
      <div className="mb-4 flex gap-2">
        <input
          value={namaBaru}
          onChange={(e) => setNamaBaru(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tambah()}
          placeholder="Nama jurusan baru"
          className="w-full rounded-xl border px-4 py-2"
        />
        <button
          onClick={tambah}
          disabled={saving}
          className="shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Tambah
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 p-6 text-slate-600">
          <Loader2 className="animate-spin" size={20} />
          Memuat jurusan...
        </div>
      ) : jurusan.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">Belum ada jurusan.</div>
      ) : (
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {jurusan.map((item) => (
            <div key={item.id_jurusan} className="flex items-center justify-between gap-2 rounded-xl border px-4 py-2">
              {editingId === item.id_jurusan ? (
                <input
                  value={editingNama}
                  onChange={(e) => setEditingNama(e.target.value)}
                  className="w-full rounded-lg border px-3 py-1"
                />
              ) : (
                <span className="font-medium text-slate-800">{item.nama_jurusan}</span>
              )}

              <div className="flex shrink-0 gap-1">
                {editingId === item.id_jurusan ? (
                  <button
                    onClick={() => simpanEdit(item)}
                    className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                  >
                    Simpan
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(item.id_jurusan)
                      setEditingNama(item.nama_jurusan)
                    }}
                    className="rounded-lg bg-amber-100 p-2 text-amber-700 hover:bg-amber-200"
                  >
                    <Edit size={14} />
                  </button>
                )}

                <button
                  onClick={() => hapus(item)}
                  className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
