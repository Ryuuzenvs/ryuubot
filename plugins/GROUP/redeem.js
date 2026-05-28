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

  // 4. Generate Hadiah Random
  const rewardMoney = Math.floor(Math.random() * 100) + 50; // 100 - 150 money
  const rewardLimit = Math.floor(Math.random() * 5) + 1;     // 1 - 6 limit

  // 5. Update Database Redeem & User
  try {
    // Kurangi stok & catat pengklaim
    db[codeIdx].stock -= 1;
    db[codeIdx].claimedBy.push(sender);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    // Tambah reward ke user
    await updateUser(sender, {
      money: (userData.money || 0) + rewardMoney,
      limit: (userData.limit || 0) + rewardLimit
    });

    const successText = `🎁 *REDEEM CODE SUCCESS* 🎁\n\n` +
                        `Selamat! Kamu mendapatkan:\n` +
                        `💰 Money: *+${rewardMoney}*\n` +
                        `🎫 Limit: *+${rewardLimit}*\n\n` +
                        `_Sisa stok kode: ${db[codeIdx].stock}_`;

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
