import config from "../../config.js"; // Import file config utama

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command , sender} = messageInfo;

    // --- VALIDASI OWNER CONFIG (HIGHEST RANK) ---
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
    // Validasi input nama
    if (!content || !content.trim()) {
      return await sock.sendMessage(
        remoteJid,
        {
          text: `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${
            prefix + command
          } resbot 4.0*_`,
        },
        { quoted: message }
      );
    }

    // Perbarui nama profil bot
    await sock.updateProfileName(content);

    // Kirim pesan sukses
    return await sock.sendMessage(
      remoteJid,
      { text: `_Sukses mengganti nama bot ke *${content}*_` },
      { quoted: message }
    );
  } catch (error) {
    console.error("Error processing message:", error);

    // Kirim pesan error
    return await sock.sendMessage(
      remoteJid,
      { text: "Terjadi kesalahan saat memproses pesan." },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["setname"],
  OnlyPremium: false,
  OnlyOwner: true,
};
