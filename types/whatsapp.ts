// Bot WA (project wabot-claude) cuma dua status: "ready" (terhubung) atau
// "not_ready" (belum/terputus) - beda dari bot whatsapp-web.js lama yang
// punya status idle/loading/qr/authenticated/disconnected, karena pairing-nya
// sekarang lewat scan QR di terminal bot (bukan lewat browser).
export type WaStatus = "ready" | "not_ready"

export type WaStatusResponse = {
  status: WaStatus
}
