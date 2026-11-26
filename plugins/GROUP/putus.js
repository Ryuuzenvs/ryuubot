import { getCouple, removeCouple } from "../../lib/couple.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender } = messageInfo;

  const coupleData = getCouple(sender);
  if (!coupleData) {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Kamu kan jomblo, mau putus sama siapa? Makanya cari pacar dulu._` },
      { quoted: message }
    );
  }

  const partnerJid = coupleData.user1 === sender ? coupleData.user2 : coupleData.user1;
  
  // Hapus data couple dari database
  removeCouple(sender);

  const senderClean = sender.split("@")[0];
  const partnerClean = partnerJid.split("@")[0];

  const text = `💔 *AKHIR SEBUAH CERITA*...\n\n@${senderClean} memutuskan untuk berpisah dari @${partnerClean}. Hubungan kalian resmi kandas di tengah jalan. Semoga lekas move on! 🚶‍♂️💨`;

  await sock.sendMessage(
    remoteJid,
    {
      text,
      contextInfo: { mentionedJid: [sender, partnerJid] },
    },
    { quoted: message }
  );
}

export default {
  handle,
  Commands: ["putus", "akhiri"],
  OnlyPremium: false,
  OnlyOwner: false,
};
