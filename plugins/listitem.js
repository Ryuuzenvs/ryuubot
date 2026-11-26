import { sendMessageWithMention } from "../lib/utils.js";

async function handle(sock, messageInfo) {

  const { remoteJid, message, sender, senderType } = messageInfo;

  const priceText = `
✦ ────── 𝐁𝐎𝐓 & 𝐒𝐄𝐑𝐕𝐄𝐑 ────── ✦
🤖 Bikin Bot
💻 Ngoding SC
⚡ Limit Bikin Bot
☁️ Sewabot
🖥️ Panel
🛒 Bot Store
📲 Push Kontak
💾 Save Kontak
✦ ───── 𝐅𝐈𝐓𝐔𝐑 & 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 ───── ✦
💎 Limit
💰 Money
👑 Premuser
🌐 Paid GC
🔒 Only RVO
🪪 Owner
🧩 Custom Fitur
✦ ───── 𝐉𝐀𝐒𝐀 𝐋𝐀𝐈𝐍 ───── ✦
🔑 Nokos
🎨 Jasa Hias QR
📝 Jasa Hias Pricelist Teks`;
  await sendMessageWithMention(

    sock,

    remoteJid,

    priceText.trim(),

    message,

    senderType

  );

}

export default {

  handle,

  Commands: ["pricelist", "harga", "price"  , "pl"],

  OnlyPremium: false,

  OnlyOwner: false,

};
