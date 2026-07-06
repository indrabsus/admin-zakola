"use client"

import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import { Edit, KeyRound, Loader2, Plus, Trash2 } from "lucide-react"
import AppShell from "@/components/app-shell"
import Modal from "@/components/modal"
import SortableTh from "@/components/sortable-th"
import { apiFetch } from "@/lib/api"
import { useSort } from "@/lib/use-sort"

type Role = {
  id_role: string
  nama_role: string
}

type UserAkun = {
  id: string
  username: string
  id_role: string
  acc: "y" | "n"
  created_at?: string
  role?: Role
}

export default function UserPage() {
  const [data, setData] = useState<UserAkun[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const [modalTambah, setModalTambah] = useState(false)
  const [username, setUsername] = useState("")
  const [idRoleBaru, setIdRoleBaru] = useState("")
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<UserAkun | null>(null)
  const [editRole, setEditRole] = useState("")
  const [editAcc, setEditAcc] = useState<"y" | "n">("y")

  const fetchData = async () => {
    try {
      setLoading(true)

      const [userRes, roleRes] = await Promise.all([
        apiFetch("/role/user"),
        apiFetch("/role/data"),
      ])

      setData(Array.isArray(userRes.data) ? userRes.data : [])
      setRoles(Array.isArray(roleRes.data) ? roleRes.data : [])
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
    setUsername("")
    setIdRoleBaru(roles[0]?.id_role || "")
    setModalTambah(true)
  }

  const submitTambah = async () => {
    if (!username || !idRoleBaru) {
      Swal.fire("Belum lengkap", "Username dan role wajib diisi.", "warning")
      return
    }

    try {
      setSaving(true)

      const res = await apiFetch("/role/createuser", {
        method: "POST",
        body: JSON.stringify({ username, id_role: idRoleBaru }),
      })

      setModalTambah(false)

      await Swal.fire({
        title: "User berhasil dibuat",
        html: `
          <p>${res.info || "User berhasil ditambahkan"}</p>
          <p class="mt-2 text-sm">Password default: <b>123456</b></p>
        `,
        icon: "success",
      })

      fetchData()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (item: UserAkun) => {
    setEditing(item)
    setEditRole(item.id_role)
    setEditAcc(item.acc)
  }

  const submitEdit = async () => {
    if (!editing) return

    try {
      setSaving(true)

      await apiFetch(`/role/updateuser/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ id_role: editRole, acc: editAcc }),
      })

      await Swal.fire({
        title: "Berhasil",
        text: "User berhasil diperbarui",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      })

      setEditing(null)
      fetchData()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async (item: UserAkun) => {
    const confirm = await Swal.fire({
      title: "Reset Password?",
      text: `Password akun ${item.username} akan dikembalikan ke default (123456).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Reset",
      cancelButtonText: "Batal",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/role/resetpassword/${item.id}`, { method: "PUT" })

      await Swal.fire({
        title: "Berhasil",
        text: `Password ${item.username} berhasil direset ke default (123456)`,
        icon: "success",
      })
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    }
  }

  const hapus = async (item: UserAkun) => {
    const confirm = await Swal.fire({
      title: "Hapus User?",
      text: `Akun ${item.username} akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      await apiFetch(`/role/deleteuser/${item.id}`, { method: "DELETE" })

      await Swal.fire({
        title: "Berhasil",
        text: "User berhasil dihapus",
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
      case "username":
        return row.username
      case "role":
        return row.role?.nama_role || ""
      case "status":
        return row.acc
      default:
        return null
    }
  })

  return (
    <AppShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User</h1>
          <p className="text-sm text-slate-500">Kelola akun pengguna staf/pegawai sistem.</p>
        </div>

        <button
          onClick={openTambah}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Tambah User
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
                  <SortableTh label="Username" sortKey="username" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Role" sortKey="role" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      Belum ada data user
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.username}</td>
                      <td className="px-4 py-3 capitalize">{item.role?.nama_role || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.acc === "y" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {item.acc === "y" ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
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
                            onClick={() => resetPassword(item)}
                            title="Reset Password"
                            className="border-r px-3 py-2 text-blue-600 hover:bg-blue-50"
                          >
                            <KeyRound size={16} />
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

      {modalTambah && (
        <Modal title="Tambah User" onClose={() => setModalTambah(false)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: budi santoso"
                className="w-full rounded-xl border px-4 py-2"
              />
              <p className="mt-1 text-xs text-slate-500">
                Username akan otomatis dirapikan dan diberi angka jika sudah dipakai.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Role</label>
              <select
                value={idRoleBaru}
                onChange={(e) => setIdRoleBaru(e.target.value)}
                className="w-full rounded-xl border px-4 py-2"
              >
                <option value="">Pilih Role</option>
                {roles.map((r) => (
                  <option key={r.id_role} value={r.id_role} className="capitalize">
                    {r.nama_role}
                  </option>
                ))}
              </select>
            </div>

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

      {editing && (
        <Modal title={`Edit User - ${editing.username}`} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full rounded-xl border px-4 py-2"
              >
                {roles.map((r) => (
                  <option key={r.id_role} value={r.id_role} className="capitalize">
                    {r.nama_role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Status Akun</label>
              <select
                value={editAcc}
                onChange={(e) => setEditAcc(e.target.value as "y" | "n")}
                className="w-full rounded-xl border px-4 py-2"
              >
                <option value="y">Aktif</option>
                <option value="n">Nonaktif</option>
              </select>
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
    </AppShell>
  )
}
