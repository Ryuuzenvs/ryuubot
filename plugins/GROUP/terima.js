import { getPendingCouple, acceptCouple } from "../../lib/couple.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender } = messageInfo;

  const pending = getPendingCouple(sender);
  if (!pending || pending.user2 !== sender) {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Tidak ada undangan / tembakan pacaran yang ditujukan kepadamu._` },
      { quoted: message }
    );
  }

  acceptCouple(sender);

  const user1Clean = pending.user1.split("@")[0];
  const user2Clean = sender.split("@")[0];

  const text = `🎉 *SELAMAT!* @ur1Clean dan @user2Clean resmi berpacaran! 💖✨\n\n_Semoga langgeng sampai ke pelaminan ya!_`.replace("@ur1Clean", `@${user1Clean}`).replace("@user2Clean", `@${user2Clean}`);

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
  Commands: ["terima", "terimapacar"],
  OnlyPremium: false,
  OnlyOwner: false,
};
