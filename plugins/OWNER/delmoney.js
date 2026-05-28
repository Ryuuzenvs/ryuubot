import { findUser, updateUser } from "../../lib/users.js";
import { sendMessageWithMention, convertToJid } from "../../lib/utils.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command, senderType } = messageInfo;

  // --- 1. Validasi Input ---
  if (!content?.trim()) {
    const tex = `_⚠️ Format: *${prefix + command} @tag 50*_\n\n` +
                `_💬 Contoh: *${prefix + command} @tag 50*_`;
    return sock.sendMessage(remoteJid, { text: tex }, { quoted: message });
  }

  const [rawNumber, rawMoney] = content.split(" ").map((s) => s.trim());

  if (!rawNumber || !rawMoney) {
    return sock.sendMessage(remoteJid, { 
      text: `⚠️ _Format salah! Masukkan tag dan jumlah money._` 
    }, { quoted: message });
  }

  // Validasi angka
  const moneyToDel = parseInt(rawMoney, 10);
  if (isNaN(moneyToDel) || moneyToDel <= 0) {
    return sock.sendMessage(remoteJid, { 
      text: `⚠️ _Jumlah money harus berupa angka positif!_` 
    }, { quoted: message });
  }

  // --- 2. Ambil JID & Cari User ---
  try {
    const targetJid = await convertToJid(sock, rawNumber);
console.log("DEBUG JID:", targetJid); // Cek di terminal munculnya apa
    const dataUsers = await findUser(targetJid);
console.log("DEBUG DATA:", dataUsers); // Kalau null, berarti loop di findUser bermasalah

    if (!dataUsers) {
      return sock.sendMessage(remoteJid, { 
        text: `⚠️ _User tidak ditemukan dalam database!_` 
      }, { quoted: message });
    }

    const [docId, userData] = dataUsers;
    const currentMoney = userData.money || 0;

    // --- 3. Eksekusi Pengurangan ---
    // Logika: Money saat ini dikurangi jumlah input
    const newMoney = currentMoney - moneyToDel;

    await updateUser(targetJid, {
      money: newMoney, // Lib kamu otomatis handle Math.max(0, newMoney)
    });

    // --- 4. Konfirmasi ---
    const caption = `✅ *PENGURANGAN BERHASIL*\n\n` +
                    `◧ Target: @${targetJid.split("@")[0]}\n` +
                    `◧ Dikurangi: *-${moneyToDel}*\n` +
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
