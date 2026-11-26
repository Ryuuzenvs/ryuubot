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
                `_💬 Contoh: *${prefix + command} @tag 50* atau *${prefix + command} @tag all*_`;
    return sock.sendMessage(remoteJid, { text: tex }, { quoted: message });
  }

  const [rawNumber, rawMoney] = content.split(" ").map((s) => s.trim());

  if (!rawNumber || !rawMoney) {
    return sock.sendMessage(remoteJid, { 
      text: `⚠️ _Format salah! Masukkan tag dan jumlah money / all._` 
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
    const currentMoney = userData.money || 0;
    
    let moneyToDel = 0;
    let isAll = false;

    // Cek apakah owner mengetik 'all'
    if (rawMoney.toLowerCase() === "all") {
      moneyToDel = currentMoney;
      isAll = true;
    } else {
      moneyToDel = parseInt(rawMoney, 10);
      if (isNaN(moneyToDel) || moneyToDel <= 0) {
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ _Jumlah money harus berupa angka positif atau kata 'all'!_` 
        }, { quoted: message });
      }
    }

    // --- 3. Eksekusi Pengurangan ---
    const newMoney = isAll ? 0 : currentMoney - moneyToDel;

    await updateUser(targetJid, {
      money: newMoney, // Lib otomatis handle Math.max(0, newMoney)
    });

    // --- 4. Konfirmasi ---
    const textDel = isAll ? `Semua (*-${moneyToDel}*)` : `*-${moneyToDel}*`;
    const caption = `✅ *PENGURANGAN MONEY BERHASIL*\n\n` +
                    `◧ Target: @${targetJid.split("@")[0]}\n` +
                    `◧ Dikurangi: ${textDel}\n` +
                    `◧ Sisa Money: *${Math.max(0, newMoney)}*`;

    await sendMessageWithMention(
      sock,
      remoteJid,
      caption,
      message,
      senderType
    );

  } catch (err) {
    console.error("Error delmoney:", err);
    await sock.sendMessage(remoteJid, { text: "❌ Terjadi kesalahan teknis." });
  }
}

export default {
  handle,
  Commands: ["delmoney", "tarikmoney"],
  OnlyPremium: false,
  OnlyOwner: true,
};
