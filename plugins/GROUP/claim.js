import { findUser, updateUser, addUser } from "../../lib/users.js";
import { formatRemainingTime } from "../../lib/utils.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender } = messageInfo;

  const CLAIM_COOLDOWN_MINUTES = 1; 
  const MIN_CLAIM_MONEY = 1;
  const MAX_CLAIM_MONEY = 5;
  
  // Persentase dapat limit (16% = 0.16)
  const LIMIT_CHANCE = 0.16; 
  const MIN_CLAIM_LIMIT = 1;
  const MAX_CLAIM_LIMIT = 3; // Limit dikit aja biar mahal

  // 1. Money pasti dapat
  const MoneyClaim = Math.floor(Math.random() * (MAX_CLAIM_MONEY - MIN_CLAIM_MONEY + 1)) + MIN_CLAIM_MONEY;

  // 2. Logic Gacha Limit (16% Chance)
  let LimitClaim = 0;
  const gachaRoll = Math.random(); // Menghasilkan angka 0 sampai 1
  
  if (gachaRoll <= LIMIT_CHANCE) {
    LimitClaim = Math.floor(Math.random() * (MAX_CLAIM_LIMIT - MIN_CLAIM_LIMIT + 1)) + MIN_CLAIM_LIMIT;
  }

  const dataUsers = await findUser(sender);
  if (dataUsers) {
    const [docId, userData] = dataUsers;
    const currentTime = Date.now();
    const CLAIM_COOLDOWN = CLAIM_COOLDOWN_MINUTES * 60 * 1000;

    if (userData.lastClaim && currentTime - userData.lastClaim < CLAIM_COOLDOWN) {
      const remainingTime = Math.floor((CLAIM_COOLDOWN - (currentTime - userData.lastClaim)) / 1000);
      const formattedTime = formatRemainingTime(remainingTime);
      return await sock.sendMessage(
        remoteJid,
        { text: `🔒 _Harap tunggu *${formattedTime}* lagi untuk klaim kembali_.` },
        { quoted: message }
      );
    }

    // Update Database
    await updateUser(sender, {
      money: (userData.money || 0) + MoneyClaim,
      limit: (userData.limit || 0) + LimitClaim,
      lastClaim: currentTime,
    });

    // 3. String dinamis
    // Jika LimitClaim > 0, tampilkan teks limitnya. Jika 0, kosongkan.
    const limitText = LimitClaim > 0 ? ` dan *${LimitClaim}* limit` : "";

    return await sock.sendMessage(
      remoteJid,
      {
        text: `🎁 _Selamat! Kamu mendapatkan *${MoneyClaim}* money${limitText}!_`,
      },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["claim"],
  OnlyPremium: false,
  OnlyOwner: false,
};
