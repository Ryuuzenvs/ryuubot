import config from "../../config.js";
import { findUser, updateUser } from "../../lib/users.js";
import { sendMessageWithMention, convertToJid } from "../../lib/utils.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command, senderType, sender } = messageInfo;

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

  // --- 1. Validasi Input ---
  if (!content?.trim()) {
    const tex = `_⚠️ Format: *${prefix + command} @tag [jumlah/all]*_\n\n` +
                `_💬 Contoh: *${prefix + command} @tag 5* atau *${prefix + command} @tag all*_`;
    return sock.sendMessage(remoteJid, { text: tex }, { quoted: message });
  }

  const [rawNumber, rawLimit] = content.split(" ").map((s) => s.trim());

  if (!rawNumber || !rawLimit) {
    return sock.sendMessage(remoteJid, { 
      text: `⚠️ _Format salah! Masukkan tag dan jumlah paid limit / all._` 
    }, { quoted: message });
  }

  // --- 2. Ambil JID & Cari User ---
  try {
    const targetJid = await convertToJid(sock, rawNumber);
    const dataUsers = await findUser(targetJid);

    if (!dataUsers) {
      return sock.sendMessage(remoteJid, { 
        text: `⚠️ _User tidak ditemukan dalam database!_` 
      }, { quoted: message });
    }

    const [docId, userData] = dataUsers;
    const currentPaidLimit = userData.paidLimit || 0;
    
    let limitToDel = 0;
    let isAll = false;

    // Cek argumen 'all'
    if (rawLimit.toLowerCase() === "all") {
      limitToDel = currentPaidLimit;
      isAll = true;
    } else {
      limitToDel = parseInt(rawLimit, 10);
      if (isNaN(limitToDel) || limitToDel <= 0) {
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ _Jumlah paid limit harus berupa angka positif atau kata 'all'!_` 
        }, { quoted: message });
      }
    }

    // --- 3. Eksekusi Pengurangan ---
    const newPaidLimit = isAll ? 0 : currentPaidLimit - limitToDel;

    await updateUser(targetJid, {
      paidLimit: Math.max(0, newPaidLimit), // Force agar tidak minus ke file json
    });

    // --- 4. Konfirmasi ---
    const textDel = isAll ? `Semua (*-${limitToDel}*)` : `*-${limitToDel}*`;
    const caption = `✅ *PENGURANGAN PAID LIMIT BERHASIL*\n\n` +
                    `◧ Target: @${targetJid.split("@")[0]}\n` +
                    `◧ Dikurangi: ${textDel}\n` +
                    `◧ Sisa Paid Limit: *${Math.max(0, newPaidLimit)}*`;

    await sendMessageWithMention(
      sock,
      remoteJid,
      caption,
      message,
      senderType
    );

  } catch (err) {
    console.error("Error delpaidlimit:", err);
    await sock.sendMessage(remoteJid, { text: "❌ Terjadi kesalahan teknis." });
  }
}

export default {
  handle,
  Commands: ["delpaidlimit", "tarikpaidlimit", "delpl"],
  OnlyPremium: false,
  OnlyOwner: true,
};
