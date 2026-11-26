import config from "../../config.js";
import { reply } from "../../lib/utils.js";
import { delOwner } from "../../lib/users.js";

async function handle(sock, messageInfo) {
  const { m, prefix, command, content, sender } = messageInfo;

  //- VALIDASI OWNER CONFIG (HIGHEST RANK) ---
  // Membersihkan senderJid (misal: '6285188510933@s.whatsapp.net' menjadi '6285188510933')
  const senderNumber = sender.split("@")[0];
  
  // Ambil array DATA_OWNER dari config.js
  const ownerConfigList = config.owner_number || [];

  if (!ownerConfigList.includes(senderNumber)) {
    return await sock.sendMessage(
      m.chat, // Menggunakan m.chat sebagai pengganti remoteJid
      { text: `❌ *Akses Ditolak:* Fitur ini hanya dapat digunakan oleh Founder Owner.` },
      { quoted: m } // Menggunakan m sebagai pengganti message
    );
  }
  // --------------------------------------------

  // Validasi input kosong
  if (!content || !content.trim()) {
    return await reply(
      m,
      `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${prefix + command} 628xxx*_`
    );
  }

  // Membersihkan input menjadi hanya angka
  const ownerNumber = content.replace(/\D/g, ""); // Menghapus karakter non-angka

  // Validasi format nomor (10-15 digit)
  if (!/^\d{10,15}$/.test(ownerNumber)) {
    return await reply(
      m,
      `_Nomor tidak valid. Pastikan formatnya benar_\n\n_Contoh: *${
        prefix + command
      } 628xxx*_`
    );
  }

  // Menghapus nomor dari daftar owner
  try {
    const result = delOwner(ownerNumber);
    if (result) {
      return await reply(
        m,
        `_Nomor ${ownerNumber} berhasil dihapus dari daftar owner._`
      );
    } else {
      return await reply(
        m,
        `_Nomor ${ownerNumber} sudah tidak ada di daftar owner._`
      );
    }
  } catch (error) {
    console.error("Error saat menghapus owner:", error);
    return await reply(m, `_Terjadi kesalahan saat memproses permintaan._`);
  }
}

export default {
  handle,
  Commands: ["delowner"],
  OnlyPremium: false,
  OnlyOwner: true,
};