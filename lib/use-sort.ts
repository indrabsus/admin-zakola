"use client"

import { useMemo, useState } from "react"

export type SortDir = "asc" | "desc"

type SortValue = string | number | null | undefined

export function useSort<T>(
  data: T[],
  getValue: (row: T, key: string) => SortValue,
  initialKey: string | null = null,
  initialDir: SortDir = "asc"
) {
  const [sortKey, setSortKey] = useState<string | null>(initialKey)
  const [sortDir, setSortDir] = useState<SortDir>(initialDir)

  const sorted = useMemo(() => {
    if (!sortKey) return data

    const withIndex = data.map((row, index) => ({ row, index }))

    withIndex.sort((a, b) => {
      const va = getValue(a.row, sortKey)
      const vb = getValue(b.row, sortKey)

      let cmp: number

      if (va == null && vb == null) cmp = 0
      else if (va == null) cmp = -1
      else if (vb == null) cmp = 1
      else if (typeof va === "number" && typeof vb === "number") cmp = va - vb
      else
        cmp = String(va).localeCompare(String(vb), "id", {
          numeric: true,
          sensitivity: "base",
        })

      if (cmp === 0) cmp = a.index - b.index

      return sortDir === "asc" ? cmp : -cmp
    })

    return withIndex.map((item) => item.row)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sortKey, sortDir])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  return { sorted, sortKey, sortDir, toggleSort }
}
