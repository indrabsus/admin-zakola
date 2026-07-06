"use client"

import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import { Edit, Loader2, Plus, Trash2 } from "lucide-react"
import AppShell from "@/components/app-shell"
import Modal from "@/components/modal"
import SortableTh from "@/components/sortable-th"
import { apiFetch } from "@/lib/api"
import { useSort } from "@/lib/use-sort"

type Role = {
  id_role: string
  nama_role: string
  created_at?: string
}

export default function RolePage() {
  const [data, setData] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const [modalForm, setModalForm] = useState(false)
  const [mode, setMode] = useState<"tambah" | "edit">("tambah")
  const [editing, setEditing] = useState<Role | null>(null)
  const [namaRole, setNamaRole] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiFetch("/role/data")
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
    setNamaRole("")
    setModalForm(true)
  }

  const openEdit = (item: Role) => {
    setMode("edit")
    setEditing(item)
    setNamaRole(item.nama_role)
    setModalForm(true)
  }

  const submit = async () => {
    if (!namaRole) {
      Swal.fire("Belum lengkap", "Nama role wajib diisi.", "warning")
      return
    }

    try {
      setSaving(true)

      const url = mode === "tambah" ? "/role/create" : `/role/update/${editing?.id_role}`
      const method = mode === "tambah" ? "POST" : "PUT"

      await apiFetch(url, { method, body: JSON.stringify({ nama_role: namaRole }) })

      await Swal.fire({
        title: "Berhasil",
        text: mode === "tambah" ? "Role berhasil ditambahkan" : "Role berhasil diperbarui",
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

  const hapus = async (item: Role) => {
    const confirm = await Swal.fire({
      title: "Hapus Role?",
      text: `Role ${item.nama_role} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/role/delete/${item.id_role}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "Role berhasil dihapus",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      fetchData()
    } catch (err) {
      Swal.fire(
        "Gagal",
        "Role mungkin masih dipakai oleh user lain. " + (err instanceof Error ? err.message : ""),
        "error"
      )
    }
  }

  const { sorted, sortKey, sortDir, toggleSort } = useSort(data, (row, key) =>
    key === "nama_role" ? row.nama_role : null
  )

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Role</h1>
          <p className="text-sm text-slate-500">Kelola daftar role akun pengguna sistem.</p>
        </div>

        <button
          onClick={openTambah}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Tambah Role
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
                  <SortableTh label="Nama Role" sortKey="nama_role" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-10 text-center text-slate-500">
                      Belum ada data role
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => (
                    <tr key={item.id_role} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold capitalize text-slate-800">{item.nama_role}</td>
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
        <Modal title={mode === "tambah" ? "Tambah Role" : "Edit Role"} onClose={() => setModalForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Nama Role</label>
              <input
                value={namaRole}
                onChange={(e) => setNamaRole(e.target.value)}
                placeholder="Contoh: adminspp"
                className="w-full rounded-xl border px-4 py-2"
              />
            </div>

            <button
              onClick={submit}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
