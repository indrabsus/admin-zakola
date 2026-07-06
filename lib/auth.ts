import { UserLogin } from "@/types/auth"

export const ADMIN_ROLES = ["admin"]

export const getUserRole = (user: UserLogin | null) => {
  return user?.role || user?.nama_role || user?.roles?.nama_role || null
}

export const saveAuth = (token: string, user: UserLogin) => {
  localStorage.setItem("token_admin", token)
  localStorage.setItem("user_admin", JSON.stringify(user))
}

export const getToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token_admin")
}

export const getUser = (): UserLogin | null => {
  if (typeof window === "undefined") return null

  const raw = localStorage.getItem("user_admin")
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const logout = () => {
  localStorage.removeItem("token_admin")
  localStorage.removeItem("user_admin")
}

export const isAllowedAdmin = (user: UserLogin | null) => {
  const role = getUserRole(user)
  return !!role && ADMIN_ROLES.includes(role)
}
