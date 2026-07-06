"use client"

import Link from "next/link"
import NProgress from "nprogress"
import type { ComponentProps } from "react"

type LoadingLinkProps = ComponentProps<typeof Link>

export default function LoadingLink({
  href,
  onClick,
  ...props
}: LoadingLinkProps) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        NProgress.start()
        onClick?.(e)
      }}
      {...props}
    />
  )
}
