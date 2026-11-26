import config from "../../config.js"; // Import file config utama

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, sender, prefix, command } = messageInfo;

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
    // Validasi input kosong atau tidak sesuai format
    if (
      !content ||
      content.trim() === "" ||
      !content.includes("whatsapp.com")
    ) {
      return await sock.sendMessage(
        remoteJid,
        {
          text: `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${
            prefix + command
          } https://chat.whatsapp.com/xxx*_`,
        },
        { quoted: message }
      );
    }

    // Kirim reaksi ⏰ untuk menunjukkan sedang memproses
    await sock.sendMessage(remoteJid, {
      react: { text: "⏰", key: message.key },
    });

    // Ekstrak ID grup dari tautan
    const groupId = content.split("chat.whatsapp.com/")[1];
    if (!groupId) {
      return await sock.sendMessage(
        remoteJid,
        { text: `⚠️ Tautan grup tidak valid.` },
        { quoted: message }
      );
    }

    // Bergabung ke grup menggunakan invite link
    try {
      await sock.groupAcceptInvite(groupId);
      await sock.sendMessage(
        remoteJid,
        { text: `✅ Berhasil bergabung ke grup.` },
        { quoted: message }
      );
    } catch (error) {
      let info = "_Pastikan link grup valid._";

      // Periksa pesan error
      if (error instanceof Error && error.message.includes("not-authorized")) {
        info = `_Kemungkinan Anda pernah dikeluarkan dari grup. Solusi: undang bot kembali atau masukkan secara manual._`;
      }

      if (error instanceof Error && error.message.includes("conflict")) {
        info = `_Bot Sudah berada di dalam grub sebelumnya_`;
      }

      // Kirim pesan error ke pengguna
      return await sock.sendMessage(
        remoteJid,
        {
          text: `⚠️ _Gagal bergabung ke grup._\n\n${info}`,
        },
        { quoted: message }
      );
    }
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
    await sock.sendMessage(
      remoteJid,
      { text: `⚠️ Terjadi kesalahan saat memproses perintah.` },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["join"],
  OnlyPremium: false,
  OnlyOwner: true,
};
