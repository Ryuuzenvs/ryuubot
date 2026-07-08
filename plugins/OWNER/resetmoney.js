import config from "../../config.js";
import { resetMoney } from "../../lib/users.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender } = messageInfo;
  
  //- VALIDASI OWNER CONFIG (HIGHEST RANK) ---
  // 1. PERBAIKAN: Jika sender tidak ada (pesan sistem/status), langsung tolak/abaikan
  if (!sender) return;

  // Membersihkan senderJid (misal: '6285188510933@s.whatsapp.net' menjadi '6285188510933')
  const senderNumber = sender.split("@")[0];
  
  // Ambil array DATA_OWNER dari config.js
  const ownerConfigList = config.owner_number || [];

  // 2. PERBAIKAN: Pastikan mencocokkan string dengan bersih
  if (!ownerConfigList.includes(senderNumber.trim())) {
    return await sock.sendMessage(
      remoteJid,
      { text: `🚫 *Akses Ditolak:* Fitur ini hanya dapat digunakan oleh Founder Owner.` },
      { quoted: message }
    );
  }
  // --------------------------------------------
  
  try {
    await sock.sendMessage(remoteJid, {
      react: { text: "⏰", key: message.key },
    });

    await resetMoney();

    await sock.sendMessage(
      remoteJid,
      { text: "✅ _Semua Money Users telah direset_" },
      { quoted: message }
    );
  } catch (error) {
    console.error("Error during database reset:", error);
    await sock.sendMessage(
      remoteJid,
      { text: "_❌ Maaf, terjadi kesalahan saat mereset data._" },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["resetmoney"],
  OnlyPremium: false,
  OnlyOwner: true,
};