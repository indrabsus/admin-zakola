"use client"

export default function Modal({
  title,
  children,
  onClose,
  maxWidth = "max-w-lg",
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  maxWidth?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
          >
            Tutup
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
