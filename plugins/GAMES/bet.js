import { findUser, updateUser } from "../../lib/users.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, sender, prefix, command } = messageInfo;

  // 1. Validasi Input Taruhan
  const taruhan = parseInt(content?.trim());
  if (isNaN(taruhan) || taruhan <= 0) {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Format salah!_\n_Contoh: *${prefix + command} 100*_` },
      { quoted: message }
    );
  }

  // 2. Cek Data User & Saldo
  const dataUsers = await findUser(sender);
  if (!dataUsers) return; // User harus terdaftar

  const [docId, userData] = dataUsers;
  const userMoney = userData.money || 0;

  if (userMoney < taruhan) {
    return await sock.sendMessage(
      remoteJid,
      { text: `❌ _Money kamu tidak cukup!_\n_Sisa Money: *${userMoney}*_` },
      { quoted: message }
    );
  }

  // 3. Logic Gacha 50/50
  // Math.random() < 0.5 artinya peluang menang 50%
  const isWin = Math.random() < 0.5;
  let finalMoney;
  let responseText;

  if (isWin) {
    const profit = taruhan; // Menang dapet 2x (taruhan balik + untung seukuran taruhan)
    finalMoney = userMoney + profit;
    responseText = `🎰 *Gacha Win!* 🎰\n\n` +
                   `📈 Kamu menang: *+${profit}*\n` +
                   `💰 Total Money: *${finalMoney}*\n\n` +
                   `_Hoki banget njer! 🔥_`;
  } else {
    finalMoney = userMoney - taruhan;
    responseText = `🎰 *Gacha Lose* 🎰\n\n` +
                   `📉 Kamu kalah: *-${taruhan}*\n` +
                   `💰 Total Money: *${finalMoney}*\n\n` +
                   `_Wkwkwk mampus, coba lagi nanti! 💀_`;
  }

  // 4. Update Database
  try {
    await updateUser(sender, { money: finalMoney });
    
    // Kasih reaksi biar asik
    await sock.sendMessage(remoteJid, { 
        react: { text: isWin ? "💸" : "🤣", key: message.key } 
    });

    await sock.sendMessage(
      remoteJid,
      { text: responseText },
      { quoted: message }
    );
  } catch (err) {
    console.error("Bet Game Error:", err);
  }
}

export default {
  handle,
  Commands: ["bet", "gacha","slot", "judi"],
  OnlyPremium: false,
  OnlyOwner: false,
};
