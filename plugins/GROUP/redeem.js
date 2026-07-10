import fs from "fs";
import { updateUser, findUser } from "../../lib/users.js";
const dbPath = "./database/redeem.json";

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, sender } = messageInfo;

  const inputCode = content?.trim().toUpperCase();
  if (!inputCode) {
    return sock.sendMessage(remoteJid, { text: "⚠️ Masukkan kode redeem!" }, { quoted: message });
  }

  const db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf-8")) : [];
  const codeIdx = db.findIndex(c => c.code === inputCode);

  if (codeIdx === -1) {
    return sock.sendMessage(remoteJid, { text: "❌ Kode redeem tidak valid!" }, { quoted: message });
  }

  const redeemData = db[codeIdx];

  // 1. Cek Stok
  if (redeemData.stock <= 0) {
    return sock.sendMessage(remoteJid, { text: "❌ Maaf, stok kode ini sudah habis!" }, { quoted: message });
  }

  // 2. Cek apakah user sudah pernah klaim kode ini (biar gak spam)
  if (redeemData.claimedBy.includes(sender)) {
    return sock.sendMessage(remoteJid, { text: "⚠️ Kamu sudah pernah mengklaim kode ini!" }, { quoted: message });
  }

  // 3. Ambil Data User
  const dataUsers = await findUser(sender);
  if (!dataUsers) return;
  const [docId, userData] = dataUsers;

  // --- [PERBAIKAN] LOGIKA FITUR PREMIUM BY KODE REDEEM ---
  let isPremiumReward = false;
  let rewardDays = 0;
  let rewardMoney = 0;
  let rewardLimit = 0;
  let configRewardMoney = Math.floor(Math.random() * 100) + 50; // 150
  let configRewardLimit = Math.floor(Math.random() * 5) + 1;     // 1 - 6 limit

  // Cek apakah kode diawali dengan 'PREM' dan memiliki format angka + 'D_' (Contoh: PREM1D_HBD, PREM30D_NEWYEAR)
  const premMatch = inputCode.match(/^PREM(\d+)D_/);

  if (premMatch) {
    isPremiumReward = true;
    rewardDays = parseInt(premMatch[1]); // Mengambil angka setelah PREM (misal: 1 atau 30)
  } else {
    // Jika bukan kode premium, jalankan hadiah random biasa
    rewardMoney =  configRewardMoney;// 100 - 150 money
    rewardLimit = configRewardLimit;
  }
  // ------------------------------------------------------

  // 5. Update Database Redeem & User
  try {
    // Kurangi stok & catat pengklaim
    db[codeIdx].stock -= 1;
    db[codeIdx].claimedBy.push(sender);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    let successText = `🎁 *REDEEM CODE SUCCESS* 🎁\n\nSelamat! Kamu mendapatkan:\n`;

    if (isPremiumReward) {
      // Hitung kalkulasi tanggal premium (meniru logika addprem.js kamu)
      const now = new Date();
      
      // Jika user sudah premium sebelumnya, tambahkan dari tanggal premium lamanya. Jika belum, dari tanggal sekarang.
      let baseDate = new Date();
      if (userData.premium) {
        const currentPremiumDate = new Date(userData.premium);
        if (!isNaN(currentPremiumDate) && currentPremiumDate > now) {
          baseDate = currentPremiumDate;
        }
      }

      baseDate.setDate(baseDate.getDate() + rewardDays);
      userData.premium = baseDate.toISOString();

      // Update data premium ke objek user
      await updateUser(sender, { premium: userData.premium });
      
      successText += `👑 Premium Status: *+${rewardDays} Hari*\n` +
                     `⏰ Aktif Sampai: _${baseDate.toLocaleString()}_\n\n`;
    } else {
      // Tambah reward biasa ke user
      await updateUser(sender, {
        money: (userData.money || 0) + rewardMoney,
        limit: (userData.limit || 0) + rewardLimit
      });

      successText += `💰 Money: *+${rewardMoney}*\n` +
                     `🎫 Limit: *+${rewardLimit}*\n\n`;
    }

    successText += `_Sisa stok kode: ${db[codeIdx].stock}_`;
    await sock.sendMessage(remoteJid, { text: successText }, { quoted: message });

  } catch (err) {
    console.error("Error Redeem:", err);
    await sock.sendMessage(remoteJid, { text: "❌ Terjadi kesalahan saat memproses kode." });
  }
}
export default {
  handle,
  Commands: ["redeem"],
};
