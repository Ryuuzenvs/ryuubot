import { findUser, updateUser } from "../../lib/users.js";
import { getDailyBoughtLimit, addDailyBoughtLimit } from "../../lib/buyLimitTracker.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, sender, prefix, command } = messageInfo;
  const pricePerLimit = 9;
  const maxDailyLimit = 10; // Batas maksimal akumulasi limit per hari

  // Validasi input kosong
  if (!content || content.trim() === "") {
    return await sock.sendMessage(
      remoteJid,
      {
        text: `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${
          prefix + command
        } 5*_\n\n_Ket : *1* limit = *${pricePerLimit}* money_\n_⚠️ Batas pembelian harian: Max *${maxDailyLimit}* limit/hari_`,
      },
      { quoted: message }
    );
  }

  // Pastikan `content` hanya angka
  const limitToBuy = parseInt(content.trim(), 10);
  if (isNaN(limitToBuy) || limitToBuy <= 0) {
    return await sock.sendMessage(
      remoteJid,
      {
        text: `⚠️ _Jumlah limit harus berupa angka positif_\n\n_Contoh: *buylimit 5*_`,
      },
      { quoted: message }
    );
  }

  // Cek riwayat pembelian harian user
  const alreadyBoughtToday = getDailyBoughtLimit(sender);
  const remainingQuota = maxDailyLimit - alreadyBoughtToday;

  // Jika sudah habis kuota harian atau pembelian melebihi sisa kuota hari ini
  if (alreadyBoughtToday >= maxDailyLimit || (alreadyBoughtToday + limitToBuy) > maxDailyLimit) {
    return await sock.sendMessage(
      remoteJid,
      {
        text: `⚠️ _Batas pembelian limit harian Anda telah tercapai!_\n\n_• Sudah dibeli hari ini: *${alreadyBoughtToday}* / ${maxDailyLimit} limit_\n_• Sisa kuota Anda: *${Math.max(0, remainingQuota)}* limit_\n\n_💡 Silakan hubungi langsung **Founder** (Owner utama) untuk pembelian manual jika butuh lebih banyak._`,
      },
      { quoted: message }
    );
  }

  const totalCost = limitToBuy * pricePerLimit;

  // Ambil data user
  const dataUsers = findUser(sender);
  if (!dataUsers) return;

  const [docId, userData] = dataUsers;

  // Validasi apakah user memiliki cukup saldo
  if (userData.money < totalCost) {
    return await sock.sendMessage(
      remoteJid,
      {
        text: `⚠️ _Saldo Anda tidak cukup untuk membeli *${limitToBuy}* limit._\n\n_Harga total:_ ${totalCost} money\n_Saldo Anda:_ ${userData.money} money`,
      },
      { quoted: message }
    );
  }

  // Catat ke tracker harian (simpan ke database/additional/buylimit.json)
  addDailyBoughtLimit(sender, limitToBuy);

  // Update data pengguna (limit bertambah, money berkurang)
  updateUser(sender, {
    limit: userData.limit + limitToBuy,
    money: userData.money - totalCost,
  });

  // Kirim pesan berhasil
  const newBoughtTotal = alreadyBoughtToday + limitToBuy;
  return await sock.sendMessage(
    remoteJid,
    {
      text: `✅ _Pembelian limit berhasil! 🎉_\n\n_• Limit bertambah: *${limitToBuy}*_\n_• Akumulasi beli hari ini: *${newBoughtTotal}* / ${maxDailyLimit} limit_\n_• Sisa Saldo:_ ${
        userData.money - totalCost
      } money`,
    },
    { quoted: message }
  );
}

export default {
  handle,
  Commands: ["buylimit", "buy limit"],
  OnlyPremium: false,
  OnlyOwner: false,
};
