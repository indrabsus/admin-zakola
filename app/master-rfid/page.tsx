"use client"

import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import { Edit, Loader2, Plus, Trash2 } from "lucide-react"
import AppShell from "@/components/app-shell"
import Modal from "@/components/modal"
import SortableTh from "@/components/sortable-th"
import { apiFetch } from "@/lib/api"
import { useSort } from "@/lib/use-sort"

type Fungsi = "absen" | "spp" | "daftar" | "bank" | "cek" | "agenda"

type MasterRfid = {
  id_rfid: string
  kode_mesin: string
  fungsi: Fungsi
  ip_address: string | null
}

const FUNGSI_OPTIONS: Fungsi[] = ["absen", "spp", "daftar", "bank", "cek", "agenda"]

const fungsiLabel: Record<Fungsi, string> = {
  absen: "Absen",
  spp: "SPP",
  daftar: "Daftar",
  bank: "Bank",
  cek: "Cek",
  agenda: "Agenda",
}

const fungsiColor: Record<Fungsi, string> = {
  absen: "bg-blue-100 text-blue-700",
  spp: "bg-emerald-100 text-emerald-700",
  daftar: "bg-amber-100 text-amber-700",
  bank: "bg-purple-100 text-purple-700",
  cek: "bg-slate-100 text-slate-700",
  agenda: "bg-pink-100 text-pink-700",
}

const emptyForm = {
  kode_mesin: "",
  fungsi: "absen" as Fungsi,
  ip_address: "",
}

export default function MasterRfidPage() {
  const [data, setData] = useState<MasterRfid[]>([])
  const [loading, setLoading] = useState(true)

  const [modalForm, setModalForm] = useState(false)
  const [mode, setMode] = useState<"tambah" | "edit">("tambah")
  const [editing, setEditing] = useState<MasterRfid | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiFetch("/rfid/master")
      setData(Array.isArray(res) ? res : [])
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
    setForm(emptyForm)
    setModalForm(true)
  }

  const openEdit = (item: MasterRfid) => {
    setMode("edit")
    setEditing(item)
    setForm({
      kode_mesin: item.kode_mesin,
      fungsi: item.fungsi,
      ip_address: item.ip_address || "",
    })
    setModalForm(true)
  }

  const submit = async () => {
    if (!form.kode_mesin || !form.fungsi) {
      Swal.fire("Belum lengkap", "Kode mesin dan fungsi wajib diisi.", "warning")
      return
    }

    try {
      setSaving(true)

      const body = {
        kode_mesin: form.kode_mesin,
        fungsi: form.fungsi,
        ip_address: form.ip_address || null,
      }

      const url = mode === "tambah" ? "/rfid/createmaster" : `/rfid/updatemaster/${editing?.id_rfid}`
      const method = mode === "tambah" ? "POST" : "PUT"

      await apiFetch(url, { method, body: JSON.stringify(body) })

      await Swal.fire({
        title: "Berhasil",
        text: mode === "tambah" ? "Master RFID berhasil ditambahkan" : "Master RFID berhasil diperbarui",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      setModalForm(false)
      fetchData()
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  const hapus = async (item: MasterRfid) => {
    const confirm = await Swal.fire({
      title: "Hapus Master RFID?",
      text: `Mesin ${item.kode_mesin} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/rfid/deletemaster/${item.id_rfid}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "Master RFID berhasil dihapus",
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
      case "kode_mesin":
        return row.kode_mesin
      case "fungsi":
        return row.fungsi
      case "ip_address":
        return row.ip_address
      default:
        return null
    }
  })

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master RFID</h1>
          <p className="text-sm text-slate-500">Pengaturan mesin/reader RFID dan fungsinya.</p>
        </div>

        <button
          onClick={openTambah}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Tambah Master RFID
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
                  <SortableTh label="Kode Mesin" sortKey="kode_mesin" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Fungsi" sortKey="fungsi" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <SortableTh label="IP Address" sortKey="ip_address" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      Belum ada data Master RFID
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => (
                    <tr key={item.id_rfid} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.kode_mesin}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${fungsiColor[item.fungsi]}`}>
                          {fungsiLabel[item.fungsi] || item.fungsi}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.ip_address || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="mx-auto flex w-fit overflow-hidden rounded-xl border border-slate-200">
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
        <Modal title={mode === "tambah" ? "Tambah Master RFID" : "Edit Master RFID"} onClose={() => setModalForm(false)}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Kode Mesin</label>
              <input
                value={form.kode_mesin}
                onChange={(e) => setForm({ ...form, kode_mesin: e.target.value })}
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Fungsi</label>
              <select
                value={form.fungsi}
                onChange={(e) => setForm({ ...form, fungsi: e.target.value as Fungsi })}
                className="w-full rounded-xl border px-4 py-2"
              >
                {FUNGSI_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {fungsiLabel[f]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">IP Address</label>
              <input
                value={form.ip_address}
                onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                placeholder="Contoh: 192.168.1.10"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </Modal>
      )}
    </AppShell>
  )
}
