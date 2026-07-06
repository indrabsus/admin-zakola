"use client"

import AppHeader from "@/components/app-header"
import AppSidebar from "@/components/app-sidebar"
import ProtectedRoute from "@/components/protected-route"

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-100">
        <AppSidebar />

        <div className="min-w-0 flex-1">
          <AppHeader />

          <main className="space-y-6 p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
