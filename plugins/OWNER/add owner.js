import { reply } from "../../lib/utils.js";
import { addOwner } from "../../lib/users.js";
import config from "../../config.js"; // Import file config utama

async function handle(sock, messageInfo) {
  const { m, prefix, command, content , sender} = messageInfo;
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

  if (!content || !content.trim()) {
    return await reply(
      m,
      `_Masukkan format yang valid_\n\n` +
      `Opsi Hari: _${prefix + command} 628xxx 30_\n` +
      `Opsi Permanen: _${prefix + command} 628xxx permanen_ atau cukup _${prefix + command} 628xxx_`
    );
  }

  const args = content.trim().split(/\s+/);
  const rawNumber = args[0];
  const durationArg = args[1] ? args[1].toLowerCase() : "permanen";

  const ownerNumber = rawNumber.replace(/\D/g, "");

  if (!/^\d{10,15}$/.test(ownerNumber)) {
    return await reply(
      m,
      `_Nomor tidak valid. Pastikan digitnya benar (10-15 digit)._`
    );
  }

  let durationParam = "PERMANENT";
  let responseText = `_Nomor ${ownerNumber} berhasil ditambahkan sebagai Owner secara *Permanen*._`;

  if (durationArg !== "permanen" && durationArg !== "permanent") {
    if (isNaN(durationArg) || parseInt(durationArg) <= 0) {
      return await reply(m, `_Format hari salah! Masukkan angka jumlah hari yang valid (Contoh: 30)._`);
    }
    durationParam = durationArg;
    responseText = `_Nomor ${ownerNumber} berhasil ditambahkan sebagai Owner selama *${durationArg} Hari*._`;
  }

  try {
    addOwner(ownerNumber, durationParam);
    return await reply(m, responseText);
  } catch (error) {
    console.error("Error saat menambahkan owner:", error);
    return await reply(m, `_Terjadi kesalahan saat memproses permintaan._`);
  }
}

export default {
  handle,
  Commands: ["addowner"],
  OnlyPremium: false,
  OnlyOwner: true,
};
