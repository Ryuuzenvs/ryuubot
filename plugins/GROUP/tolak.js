import { getPendingCouple, removeCouple } from "../../lib/couple.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender } = messageInfo;

  const pending = getPendingCouple(sender);
  if (!pending || pending.user2 !== sender) {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Tidak ada undangan pacaran yang perlu ditolak._` },
      { quoted: message }
    );
  }

  removeCouple(sender);

  const user1Clean = pending.user1.split("@")[0];
  const user2Clean = sender.split("@")[0];

  const text = `💔 Sabar ya @${user1Clean}, kamu ditolak mentah-mentah sama @${user2Clean}. Cari yang lain masih banyak! 😂`;

  await sock.sendMessage(
    remoteJid,
    {
      text,
      contextInfo: { mentionedJid: [pending.user1, sender] },
    },
    { quoted: message }
  );
}

export default {
  handle,
  Commands: ["tolak", "tolakpacar"],
  OnlyPremium: false,
  OnlyOwner: false,
};
