"use client"

import { useEffect, useState } from "react"
import Swal from "sweetalert2"
import { Clock, Database, Download, Loader2, Trash2, Upload } from "lucide-react"
import AppShell from "@/components/app-shell"
import SortableTh from "@/components/sortable-th"
import { API_URL } from "@/lib/api"
import { apiFetch } from "@/lib/api"
import { getToken } from "@/lib/auth"
import { useSort } from "@/lib/use-sort"

type BackupFile = {
  name: string
  size: number
  created_at: string
}

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} B`
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export default function BackupRestorePage() {
  const [files, setFiles] = useState<BackupFile[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [creating, setCreating] = useState(false)
  const [downloadingName, setDownloadingName] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [restoring, setRestoring] = useState(false)

  const fetchList = async () => {
    try {
      setLoadingList(true)
      const res = await apiFetch("/backup/database/list")
      setFiles(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const buatBackup = async () => {
    try {
      setCreating(true)

      const token = getToken()

      const res = await fetch(`${API_URL}/backup/database`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.message || "Backup gagal")
      }

      const disposition = res.headers.get("Content-Disposition") || ""
      const match = disposition.match(/filename="(.+)"/)
      const filename = match ? match[1] : `backup-${Date.now()}.sql`

      const blob = await res.blob()
      downloadBlob(blob, filename)

      await Swal.fire({
        icon: "success",
        title: "Backup Berhasil",
        text: "Backup database berhasil dibuat dan diunduh.",
      })

      fetchList()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setCreating(false)
    }
  }

  const downloadExisting = async (name: string) => {
    try {
      setDownloadingName(name)

      const token = getToken()

      const res = await fetch(`${API_URL}/backup/database/download/${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error("Gagal mengunduh backup")

      const blob = await res.blob()
      downloadBlob(blob, name)
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setDownloadingName(null)
    }
  }

  const hapusBackup = async (name: string) => {
    const confirm = await Swal.fire({
      title: "Hapus Backup?",
      text: `File ${name} akan dihapus permanen dari server.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    })

    if (!confirm.isConfirmed) return

    try {
      setDeletingName(name)
      await apiFetch(`/backup/database/${encodeURIComponent(name)}`, { method: "DELETE" })
      fetchList()
    } catch (err) {
      Swal.fire("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setDeletingName(null)
    }
  }

  const handleRestore = async () => {
    if (!file) {
      Swal.fire({ icon: "warning", title: "Pilih File", text: "Silakan pilih file backup .sql terlebih dahulu." })
      return
    }

    const confirm = await Swal.fire({
      title: "Restore Seluruh Database?",
      html: `
        <p>Semua data pada database saat ini akan <b>ditimpa total</b> oleh isi file backup.</p>
        <p class="mt-2">Tindakan ini <b>tidak bisa dibatalkan</b>. Ketik <b>RESTORE</b> untuk melanjutkan.</p>
      `,
      icon: "warning",
      input: "text",
      inputPlaceholder: "Ketik RESTORE",
      showCancelButton: true,
      confirmButtonText: "Ya, Restore Sekarang",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      preConfirm: (value) => {
        if (value !== "RESTORE") {
          Swal.showValidationMessage("Ketik RESTORE (huruf besar semua) untuk konfirmasi")
          return false
        }
        return true
      },
    })

    if (!confirm.isConfirmed) return

    try {
      setRestoring(true)

      const token = getToken()
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`${API_URL}/backup/database/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.message || "Restore gagal")
      }

      await Swal.fire({
        icon: "success",
        title: "Restore Selesai",
        text: result.message || "Database berhasil direstore.",
      })

      setFile(null)
    } catch (err) {
      Swal.fire("Restore Gagal", err instanceof Error ? err.message : "Terjadi kesalahan", "error")
    } finally {
      setRestoring(false)
    }
  }

  const { sorted: sortedFiles, sortKey, sortDir, toggleSort } = useSort(files, (row, key) => {
    switch (key) {
      case "name":
        return row.name
      case "size":
        return row.size
      case "created_at":
        return new Date(row.created_at).getTime()
      default:
        return null
    }
  })

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Backup & Restore Database</h1>
        <p className="text-sm text-slate-500">
          Backup dan restore seluruh isi database secara penuh (bukan per-modul).
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
        <Clock size={18} className="mt-0.5 shrink-0" />
        <div>
          <b>Backup Otomatis Aktif:</b> sistem membuat backup database otomatis setiap hari jam
          01:00 WIB. Hanya 3 backup terakhir yang disimpan di server — backup yang lebih lama
          otomatis dihapus. Backup otomatis ditandai badge <b>Otomatis</b> pada daftar riwayat di
          bawah.
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <Database className="text-blue-600" />
          </div>

          <h2 className="mb-2 text-lg font-bold">Backup Database</h2>

          <p className="mb-6 text-sm text-slate-500">
            Membuat dump penuh seluruh tabel database dalam format .sql dan mengunduhnya.
          </p>

          <button
            onClick={buatBackup}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Membackup...
              </>
            ) : (
              <>
                <Download size={18} />
                Buat & Download Backup
              </>
            )}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <Upload className="text-red-600" />
          </div>

          <h2 className="mb-2 text-lg font-bold">Restore Database</h2>

          <p className="mb-4 text-sm text-slate-500">
            Restore seluruh database dari file backup .sql. Data saat ini akan ditimpa.
          </p>

          <input
            type="file"
            accept=".sql"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-4 w-full rounded-xl border p-3"
          />

          {file && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">{file.name}</div>}

          <button
            onClick={handleRestore}
            disabled={!file || restoring}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {restoring ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Merestore...
              </>
            ) : (
              <>
                <Upload size={18} />
                Restore Database
              </>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        <b>Perhatian:</b> Restore akan mengganti seluruh isi database yang sedang berjalan dengan isi
        file backup. Pastikan Anda sudah membuat backup terbaru sebelum melakukan restore.
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-bold text-slate-800">Riwayat Backup</h2>
          <p className="text-sm text-slate-500">Daftar file backup yang tersimpan di server.</p>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center gap-3 p-10 text-slate-600">
            <Loader2 className="animate-spin" size={22} />
            Memuat riwayat backup...
          </div>
        ) : files.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Belum ada file backup.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <SortableTh label="Nama File" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Ukuran" sortKey="size" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Dibuat" sortKey="created_at" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {sortedFiles.map((item) => (
                  <tr key={item.name} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{item.name}</span>
                        {item.name.startsWith("auto-backup-") && (
                          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Otomatis
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatSize(item.size)}</td>
                    <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="mx-auto flex w-fit overflow-hidden rounded-xl border border-slate-200">
                        <button
                          onClick={() => downloadExisting(item.name)}
                          disabled={downloadingName === item.name}
                          title="Download"
                          className="border-r px-3 py-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        >
                          {downloadingName === item.name ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Download size={16} />
                          )}
                        </button>

                        <button
                          onClick={() => hapusBackup(item.name)}
                          disabled={deletingName === item.name}
                          title="Hapus"
                          className="px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingName === item.name ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
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
    </AppShell>
  )
}
