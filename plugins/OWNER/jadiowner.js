import { reply } from "../../lib/utils.js";
import { addOwner } from "../../lib/users.js";
import config from "../../config.js";

async function handle(sock, messageInfo) {
  const { m, prefix, command, content, sender } = messageInfo;

  if (!sender) return;

  // 1. Ambil password yang terdaftar di config.js
//  const secretPassword = config.owner_password;

const secretPassword = "Dahna1357";

  // Cek apakah password di config sudah di-set oleh kamu
  if (!secretPassword) {
    return await reply(
      m,
      `⚠️ *Sistem Error:* Password owner belum diatur di file config.`
    );
  }

  // 2. Validasi input dari user
  const inputPassword = content ? content.trim() : "";

  if (!inputPassword) {
    return await reply(
      m,
      `_Masukkan password yang benar._\n\nContoh: _${prefix + command} password123_`
    );
  }

  // 3. Cek kecocokan password
  if (inputPassword !== secretPassword) {
    return await reply(
      m,
      `🚫 *Akses Ditolak:* Password yang kamu masukkan salah!`
    );
  }

  // 4. Bersihkan JID pengirim untuk mendapatkan nomor telepon (misal: '628xxx@s.whatsapp.net' -> '628xxx')
  const senderNumber = sender.split("@")[0];

  try {
    // Tambahkan user sebagai owner permanen
    addOwner(senderNumber, "PERMANENT");

    return await reply(
      m,
      `🎉 *Selamat!* Nomor @${senderNumber} berhasil ditambahkan sebagai Owner secara *Permanen*.`
    );
  } catch (error) {
    console.error("Error saat klaim jadiowner:", error);
    return await reply(m, `_Terjadi kesalahan saat memproses klaim owner._`);
  }
}

export default {
  handle,
  Commands: ["jadiowner", "claimowner"],
  OnlyPremium: false,
  OnlyOwner: false, // HARUS false agar user biasa/teman kamu bisa menjalankan command ini
};