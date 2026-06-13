import { findUser, updateUser } from "../../lib/users.js";
import { doGacha } from "../../lib/gacha.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, sender } = messageInfo;

  // 1. Validasi Input Jumlah Pull
  const pullCount = parseInt(content) || 1; // Default 1 pull jika cuma ketik .gacha
  if (pullCount < 1 || pullCount > 100) {
    return await sock.sendMessage(remoteJid, 
      { text: "⚠️ Maksimal 100 pull sekali jalan!" }, 
      { quoted: message }
    );
  }

  // 2. Cek Data User
  const dataUsers = await findUser(sender);
  if (!dataUsers) return;
  const [docId, userData] = dataUsers;

  // 3. Biaya Gacha (Contoh: 1 pull = 160 money)
  const cost = pullCount * 160;
  if ((userData.money || 0) < cost) {
    return await sock.sendMessage(remoteJid,
      { text: `❌ Money tidak cukup!\n\nButuh: *${cost}*\nMoney Kamu: *${userData.money || 0}*` },
      { quoted: message }
    );
  }

  // 4. Eksekusi Gacha
  const gachaResult = doGacha(pullCount, userData);

  // 5. Update Database
  // Kita simpan pity dan status guarantee kembali ke DB
  await updateUser(sender, {
    money: (userData.money || 0) - cost,
    gachaPity: gachaResult.newPity,
    gachaGuaranteed: gachaResult.newGuaranteed,
    totalLimited: (userData.totalLimited || 0) + gachaResult.totalLimitedB5
  });

  // 6. Susun Response
  let response = `🎰 *GACHA RESULT* (${pullCount} Pulls)\n`;
  response += `========================\n`;
  response += `${gachaResult.results.join(' ')}\n`;
  response += `========================\n\n`;
  
  response += `📊 *STATISTIK*\n`;
  response += `┣ 🌟 Limited B5: ${gachaResult.totalLimitedB5}\n`;
  response += `┣ 💀 Standar B5: ${gachaResult.totalStandB5}\n`;
  response += `┣ 📈 Current Pity: ${gachaResult.newPity}\n`;
  response += `┣ 🔐 Status: ${gachaResult.newGuaranteed ? 'Guaranteed' : '50/50'}\n`;
  
  if (gachaResult.obtainedB5L.length > 0) {
    response += `┣ 📜 Pity Ke: [${gachaResult.obtainedB5L.join(', ')}]\n`;
  }
  
  response += `┗ 💰 Biaya: ${cost} money\n\n`;
  response += `_Gunakan *.gacha <jumlah>* untuk gacha lagi._`;

  return await sock.sendMessage(remoteJid, { text: response }, { quoted: message });
}

export default {
  handle,
  Commands: ["gachagenshin","gachahsr", "pull", "g"], 
  OnlyPremium: false,
  OnlyOwner: false,
};
