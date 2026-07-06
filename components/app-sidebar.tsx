"use client"

import LoadingLink from "@/components/loading-link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  School,
  History,
  ClipboardList,
  Wallet,
  ShieldCheck,
  UserCog,
  DatabaseBackup,
  Menu,
  X,
} from "lucide-react"

const menus = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Siswa", href: "/siswa", icon: Users },
  { title: "Kelas PPDB", href: "/kelas-ppdb", icon: School },
  { title: "Pengaturan Kelas", href: "/riwayat-kelas", icon: History },
  { title: "Master PPDB", href: "/master-ppdb", icon: ClipboardList },
  { title: "Master SPP", href: "/master-spp", icon: Wallet },
  { title: "Role", href: "/role", icon: ShieldCheck },
  { title: "User", href: "/user", icon: UserCog },
  { title: "Backup & Restore", href: "/backup-restore", icon: DatabaseBackup },
]

export default function AppSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-[9999] rounded-xl bg-slate-950 p-2 text-white shadow-lg md:hidden"
      >
        <Menu size={22} />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <aside
        className={
          collapsed
            ? "hidden min-h-screen w-20 shrink-0 bg-slate-950 p-4 text-white transition-all duration-300 md:block"
            : "hidden min-h-screen w-64 shrink-0 bg-slate-950 p-4 text-white transition-all duration-300 md:block"
        }
      >
        <SidebarHeader
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />

        <SidebarMenu
          pathname={pathname}
          collapsed={collapsed}
          onMenuClick={() => {}}
        />
      </aside>

      <aside
        className={
          mobileOpen
            ? "fixed left-0 top-0 z-50 h-screen w-64 bg-slate-950 p-4 text-white transition-transform duration-300 md:hidden translate-x-0"
            : "fixed left-0 top-0 z-50 h-screen w-64 bg-slate-950 p-4 text-white transition-transform duration-300 md:hidden -translate-x-full"
        }
      >
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <SidebarHeader collapsed={false} onToggle={() => {}} hideToggle />

        <SidebarMenu
          pathname={pathname}
          collapsed={false}
          onMenuClick={() => setMobileOpen(false)}
        />
      </aside>
    </>
  )
}

function SidebarHeader({
  collapsed,
  onToggle,
  hideToggle = false,
}: {
  collapsed: boolean
  onToggle: () => void
  hideToggle?: boolean
}) {
  return (
    <div
      className={
        collapsed
          ? "mb-8 flex flex-col items-center gap-4"
          : "mb-8 flex items-start justify-between gap-3"
      }
    >
      <div className={collapsed ? "text-center" : ""}>
        <h1 className="text-xl font-bold">Admin</h1>

        {!collapsed && (
          <p className="text-xs text-slate-400">Sakuci Admin Panel</p>
        )}
      </div>

      {!hideToggle && (
        <button
          onClick={onToggle}
          className="rounded-lg p-2 hover:bg-slate-800"
          title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          <Menu size={20} />
        </button>
      )}
    </div>
  )
}

function SidebarMenu({
  pathname,
  collapsed,
  onMenuClick,
}: {
  pathname: string
  collapsed: boolean
  onMenuClick: () => void
}) {
  return (
    <nav className="space-y-2">
      {menus.map((menu) => {
        const Icon = menu.icon
        const active = pathname === menu.href || pathname.startsWith(`${menu.href}/`)

        return (
          <LoadingLink
            key={menu.href}
            href={menu.href}
            onClick={onMenuClick}
            title={collapsed ? menu.title : undefined}
            className={
              active
                ? collapsed
                  ? "flex items-center justify-center rounded-xl bg-blue-600 px-3 py-3 text-white transition"
                  : "flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-sm text-white transition"
                : collapsed
                ? "flex items-center justify-center rounded-xl px-3 py-3 text-slate-300 transition hover:bg-slate-800"
                : "flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800"
            }
          >
            <Icon size={18} />

            {!collapsed && <span>{menu.title}</span>}
          </LoadingLink>
        )
      })}
    </nav>
  )
}
