import { sendMessageWithMention } from "../../lib/utils.js";
import { listOwner, getOwnerDurationDetails } from "../../lib/users.js";

export async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, senderType } = messageInfo;
  const data = listOwner();

  if (data.length === 0) {
    return await sendMessageWithMention(
      sock,
      remoteJid,
      "Belum ada buyer atau user yang membeli role owner saat ini.",
      message,
      senderType
    );
  }

  let txt = `*Daftar Owner (Buyer)*\n\n`;
  let mentions = [];

  data.forEach((item, no) => {
    const jid = item.includes("@") ? item : `${item}@s.whatsapp.net`;
    const number = jid.split("@")[0];
    
    // Ambil detail durasi dari lib/users.js
    const duration = getOwnerDurationDetails(number);
    let expiredStatus = "";

    if (duration === "PERMANENT") {
      expiredStatus = "Permanen";
    } else {
      const pDate = new Date(duration);
      expiredStatus = pDate.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    
    txt += `${no + 1}. @${number} [ Exp: ${expiredStatus} ]\n`;
    mentions.push(jid);
  });

  txt += `\nTotal: ${data.length} Owner Premium`;

  await sock.sendMessage(
    remoteJid,
    { text: txt, mentions: mentions },
    { quoted: message }
  );
}

export default {
  Commands: ["listowner"],
  OnlyPremium: false,
  OnlyOwner: true,
  handle,
};
