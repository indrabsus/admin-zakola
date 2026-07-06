"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { SortDir } from "@/lib/use-sort"

export default function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = "left",
  className = "",
}: {
  label: string
  sortKey: string
  activeKey: string | null
  dir: SortDir
  onSort: (key: string) => void
  align?: "left" | "right" | "center"
  className?: string
}) {
  const active = activeKey === sortKey

  const textAlign =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"

  const justify =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"

  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`cursor-pointer select-none px-4 py-3 ${textAlign} transition hover:bg-slate-100 ${className}`}
    >
      <span className={`inline-flex w-full items-center gap-1 ${justify}`}>
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-30" />
        )}
      </span>
    </th>
  )
}
