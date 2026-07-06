export type UserLogin = {
  userId?: number | string
  id?: number | string
  username: string
  nama_lengkap?: string | null
  id_role?: string
  role?: string
  nama_role?: string
  roles?: {
    nama_role: string
  }
}
