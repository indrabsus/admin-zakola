import { logout } from "@/lib/auth"

export const API_URL = process.env.NEXT_PUBLIC_API_URL

// Bot WA sekarang dihosting terpisah (project wabot-claude), bukan lagi
// bagian dari backend sakuci-express - endpoint /wa/status, /wa/chats,
// /wa/kirim dipanggil ke sini, dengan kontrak response yang sama persis
// (lihat README wabot-claude) supaya tidak perlu ubah cara pemanggilannya.
export const WA_API_URL = process.env.NEXT_PUBLIC_WA_API_URL

async function fetchDariBase(baseUrl: string | undefined, endpoint: string, options: RequestInit) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token_admin")
      : null

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(token && {
        Authorization: `Bearer ${token}`,
      }),
      ...options.headers,
    },
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // Token expired/invalid: backend membalas 401 untuk sesi yang sudah tidak
    // valid lagi - langsung logout & lempar ke login daripada membiarkan user
    // terjebak di halaman yang terus gagal fetch.
    if (res.status === 401 && typeof window !== "undefined") {
      logout()
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }

    throw new Error(data?.message || "Terjadi kesalahan")
  }

  return data
}

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  return fetchDariBase(API_URL, endpoint, options)
}

export const waFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  return fetchDariBase(WA_API_URL, endpoint, options)
}
