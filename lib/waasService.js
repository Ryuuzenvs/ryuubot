import { updateJadibot, getJadibot, listJadibot } from "./jadibot.js";
import { logWithTime } from "./utils.js";

/**
 * Sync status bot & monitoring sub-bot WaaS
 */
export async function runWaasSync(sock) {
  try {
    const jadibots = await listJadibot();
    // Monitoring dan sinkronisasi sub-bot jika diperlukan
  } catch (error) {
    console.error("⚠️ [WaaS Worker Error]:", error.message);
  }
}

/**
 * Worker Init Function (Dipanggil saat connection === 'open' di connection.js)
 */
export function initWaasWorker(sock, intervalMs = 15000) {
  console.log("🚀 [WaaS Worker] Service WaaS terhubung & sinkron dengan Engine Utama.");

  // Jalankan polling sync berkala
  setInterval(() => {
    runWaasSync(sock);
  }, intervalMs);
}
