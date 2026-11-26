import config from "../../config.js";
import { resetLimit } from "../../lib/users.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender } = messageInfo;
  
 //- VALIDASI OWNER CONFIG (HIGHEST RANK) ---
  // Membersihkan senderJid (misal: '6285188510933@s.whatsapp.net' menjadi '6285188510933')
  const senderNumber = sender.split("@")[0];
  
  // Ambil array DATA_OWNER dari config.js
  const ownerConfigList = config.owner_number || [];

  if (!ownerConfigList.includes(senderNumber)) {
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

    await resetLimit();

    await sock.sendMessage(
      remoteJid,
      { text: "✅ _Semua Limit Users telah direset_" },
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
  Commands: ["resetlimit"],
  OnlyPremium: false,
  OnlyOwner: true,
};
