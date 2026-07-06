"use client"

import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import { Edit, Loader2, Plus, Trash2 } from "lucide-react"
import AppShell from "@/components/app-shell"
import Modal from "@/components/modal"
import SortableTh from "@/components/sortable-th"
import { apiFetch } from "@/lib/api"
import { useSort } from "@/lib/use-sort"

type MasterSpp = {
  id_spp: string
  tahun: number
  spp10: number
  spp11: number
  spp12: number
  daftar_ulang_11: number | null
  daftar_ulang_12: number | null
  pkl: number | null
  ujian_akhir: number | null
}

const rupiah = (angka: number | null) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(
    Number(angka) || 0
  )

const emptyForm = {
  tahun: String(new Date().getFullYear()),
  spp10: "",
  spp11: "",
  spp12: "",
  daftar_ulang_11: "",
  daftar_ulang_12: "",
  pkl: "",
  ujian_akhir: "",
}

export default function MasterSppPage() {
  const [data, setData] = useState<MasterSpp[]>([])
  const [loading, setLoading] = useState(true)

  const [modalForm, setModalForm] = useState(false)
  const [mode, setMode] = useState<"tambah" | "edit">("tambah")
  const [editing, setEditing] = useState<MasterSpp | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiFetch("/spp/master")
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
    setForm(emptyForm)
    setModalForm(true)
  }

  const openEdit = (item: MasterSpp) => {
    setMode("edit")
    setEditing(item)
    setForm({
      tahun: String(item.tahun),
      spp10: String(item.spp10 ?? ""),
      spp11: String(item.spp11 ?? ""),
      spp12: String(item.spp12 ?? ""),
      daftar_ulang_11: String(item.daftar_ulang_11 ?? ""),
      daftar_ulang_12: String(item.daftar_ulang_12 ?? ""),
      pkl: String(item.pkl ?? ""),
      ujian_akhir: String(item.ujian_akhir ?? ""),
    })
    setModalForm(true)
  }

  const submit = async () => {
    if (!form.tahun || !form.spp10 || !form.spp11 || !form.spp12) {
      Swal.fire("Belum lengkap", "Tahun dan biaya SPP 10/11/12 wajib diisi.", "warning")
      return
    }

    try {
      setSaving(true)

      const body = {
        tahun: Number(form.tahun),
        spp10: Number(form.spp10),
        spp11: Number(form.spp11),
        spp12: Number(form.spp12),
        daftar_ulang_11: form.daftar_ulang_11 ? Number(form.daftar_ulang_11) : null,
        daftar_ulang_12: form.daftar_ulang_12 ? Number(form.daftar_ulang_12) : null,
        pkl: form.pkl ? Number(form.pkl) : null,
        ujian_akhir: form.ujian_akhir ? Number(form.ujian_akhir) : null,
      }

      const url = mode === "tambah" ? "/spp/createmaster" : `/spp/updatemaster/${editing?.id_spp}`
      const method = mode === "tambah" ? "POST" : "PUT"

      await apiFetch(url, { method, body: JSON.stringify(body) })

      await Swal.fire({
        title: "Berhasil",
        text: mode === "tambah" ? "Master SPP berhasil ditambahkan" : "Master SPP berhasil diperbarui",
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

  const hapus = async (item: MasterSpp) => {
    const confirm = await Swal.fire({
      title: "Hapus Master SPP?",
      text: `Data SPP tahun ${item.tahun} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/spp/deletemaster/${item.id_spp}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "Master SPP berhasil dihapus",
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
      case "spp10":
        return Number(row.spp10)
      case "spp11":
        return Number(row.spp11)
      case "spp12":
        return Number(row.spp12)
      case "daftar_ulang_11":
        return Number(row.daftar_ulang_11)
      case "daftar_ulang_12":
        return Number(row.daftar_ulang_12)
      case "pkl":
        return Number(row.pkl)
      case "ujian_akhir":
        return Number(row.ujian_akhir)
      default:
        return null
    }
  })

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master SPP</h1>
          <p className="text-sm text-slate-500">Pengaturan nominal SPP per tahun ajaran.</p>
        </div>

        <button
          onClick={openTambah}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Tambah Master SPP
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
                  <SortableTh label="SPP X" sortKey="spp10" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortableTh label="SPP XI" sortKey="spp11" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortableTh label="SPP XII" sortKey="spp12" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortableTh label="Daftar Ulang XI" sortKey="daftar_ulang_11" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortableTh label="Daftar Ulang XII" sortKey="daftar_ulang_12" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortableTh label="PKL" sortKey="pkl" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <SortableTh label="Ujian Akhir" sortKey="ujian_akhir" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      Belum ada data Master SPP
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => (
                    <tr key={item.id_spp} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.tahun}</td>
                      <td className="px-4 py-3 text-right">{rupiah(item.spp10)}</td>
                      <td className="px-4 py-3 text-right">{rupiah(item.spp11)}</td>
                      <td className="px-4 py-3 text-right">{rupiah(item.spp12)}</td>
                      <td className="px-4 py-3 text-right">{rupiah(item.daftar_ulang_11)}</td>
                      <td className="px-4 py-3 text-right">{rupiah(item.daftar_ulang_12)}</td>
                      <td className="px-4 py-3 text-right">{rupiah(item.pkl)}</td>
                      <td className="px-4 py-3 text-right">{rupiah(item.ujian_akhir)}</td>
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
        <Modal title={mode === "tambah" ? "Tambah Master SPP" : "Edit Master SPP"} onClose={() => setModalForm(false)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Tahun" value={form.tahun} onChange={(v) => setForm({ ...form, tahun: v })} type="number" />
            <FormField label="SPP Kelas X" value={form.spp10} onChange={(v) => setForm({ ...form, spp10: v })} type="number" />
            <FormField label="SPP Kelas XI" value={form.spp11} onChange={(v) => setForm({ ...form, spp11: v })} type="number" />
            <FormField label="SPP Kelas XII" value={form.spp12} onChange={(v) => setForm({ ...form, spp12: v })} type="number" />
            <FormField label="Daftar Ulang XI" value={form.daftar_ulang_11} onChange={(v) => setForm({ ...form, daftar_ulang_11: v })} type="number" />
            <FormField label="Daftar Ulang XII" value={form.daftar_ulang_12} onChange={(v) => setForm({ ...form, daftar_ulang_12: v })} type="number" />
            <FormField label="PKL" value={form.pkl} onChange={(v) => setForm({ ...form, pkl: v })} type="number" />
            <FormField label="Ujian Akhir" value={form.ujian_akhir} onChange={(v) => setForm({ ...form, ujian_akhir: v })} type="number" />
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

function FormField({
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
