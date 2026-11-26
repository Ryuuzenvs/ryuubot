import config from "../../config.js";
import { findUser, updateUser } from '../../lib/users.js';
import { sendMessageWithMention } from '../../lib/utils.js';

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, content, prefix, command, senderType } = messageInfo;

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
    // Validasi input
    if (!content || content.trim() === '') {
      const tex = `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${prefix + command} 6285246154386*_`;
      return await sock.sendMessage(remoteJid, { text: tex }, { quoted: message });
    }

    let nomorHp = content;

    // Validasi input lebih lanjut
    if (!nomorHp) {
      const tex = '_Pastikan format yang benar : .delprem 6285246154386_';
      return await sock.sendMessage(remoteJid, { text: tex }, { quoted: message });
    }

    nomorHp = nomorHp.replace(/\D/g, '');

    // Ambil data pengguna
    let dataUsers = await findUser(nomorHp);

    // Jika pengguna tidak ditemukan, tambahkan pengguna baru
    if (!dataUsers) {
      return await sock.sendMessage(
        remoteJid,
        { text: 'tidak ada user di temukan' },
        { quoted: message },
      );
    }

    const [docId, userData] = dataUsers;

    userData.premium = null;

    // Update data pengguna di database
    await updateUser(nomorHp, userData);

    const responseText = `_Pengguna_ @${nomorHp.split('@')[0]} _telah di hapus dari premium:_`;

    // Kirim pesan dengan mention
    await sendMessageWithMention(sock, remoteJid, responseText, message, senderType);
  } catch (error) {
    console.error('Error processing premium addition:', error);

    // Kirim pesan kesalahan ke pengguna
    await sock.sendMessage(
      remoteJid,
      {
        text: 'Terjadi kesalahan saat memproses data. Silakan coba lagi nanti.',
      },
      { quoted: message },
    );
  }
}

export default {
  handle,
  Commands: ['delprem', 'delpremium'],
  OnlyPremium: false,
  OnlyOwner: true, // Hanya owner yang bisa akses
};
