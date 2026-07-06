"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import NProgress from "nprogress"

import "nprogress/nprogress.css"

export default function TopLoader() {
  const pathname = usePathname()

  useEffect(() => {
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 100,
      minimum: 0.2,
      speed: 400,
    })
  }, [])

  useEffect(() => {
    NProgress.done()
  }, [pathname])

  return null
}
