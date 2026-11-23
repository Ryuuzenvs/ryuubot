import { sendMessageWithMention } from "../lib/utils.js";

// Daftar kategori pricelist
const categories = {
  limit: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗟𝗜𝗠𝗜𝗧*
.𖤓 ✦. *𝗟𝗜𝗠𝗜T*
ㅤㅤㅤ .. 📌
ㅤ    *· ✦ 🖇꯭ ׁ 100 : Rp.1.000*
ㅤ    *· ✦ 🖇꯭ ׁ 1.000 : Rp.5.000*
ㅤ    *· ✦ 🖇꯭ ׁ 5.000 : Rp.15.000*
`.trim(),

  money: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗠𝗢𝗡𝗘𝗬*
✦. *𝗠𝗢𝗡𝗘𝗬*
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1.000* :   *Rp.1.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *10.000* :   *Rp.5.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *15.000* :   *Rp.10.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *25.000* :   *Rp.15.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *35.000* :   *Rp.25.000*
`.trim(),

  prem: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗣𝗥𝗘𝗠𝗜𝗨𝗠*
✦.  𝗣𝗥𝗘𝗠
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Hari*   :   *Rp.200*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *3 Hari*   :   *Rp.600*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Minggu*   :   *Rp.1.400*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Bulan*   :   *Rp.4.400*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *6 Bulan* :   *Rp.20.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Tahun* :   *Rp.35.000*
`.trim(),

  paigc: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗣𝗔𝗜𝗗 𝗚𝗖*
✦. *PAID GC*
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 hari* : *Rp.500*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *3 hari* : *Rp.1000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *7 hari* : *Rp.2000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *10 hari* : *Rp.3000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *30 hari* : *Rp.5000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *90 hari* : *Rp.10.000*
`.trim(),

  sewa: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗦𝗘𝗪𝗔 𝗕𝗢𝗧*
✦. *𝗦𝗘𝗪𝗔 𝗕𝗢𝗧 (𝗚𝗥𝗢𝗨𝗣)*
ㅤㅤㅤ .. 📌
 ·  ✦ㅤ🖇꯭  ׁ  *1 hari* : *Rp.300*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Minggu* :   *Rp.2.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Bulan* :   *Rp.7.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *6 Bulan* :   *Rp.30.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Tahun* :   *Rp.55.000*
`.trim(),

  rvo: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗢𝗡𝗟𝗬 𝗥𝗩𝗢*
✦. *ONLY RVO*
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *5x RVO* : *Rp.1.200*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *10x RVO* : *Rp.1.500*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *15x RVO* : *Rp.2.400*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *20x RVO* : *Rp.3.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *25x RVO* : *Rp.3.600*
`.trim(),

  owner: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗢𝗪𝗡𝗘𝗥*
✦. *OWNER*
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Hari* :   *Rp.500*
    ·  ✦ㅤ🖇꯭  ׁ  *1 Minggu* :   *Rp.2.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Bulan* :   *Rp.5.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *6 Bulan* :   *Rp.35.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Tahun* :   *Rp.55.000*
`.trim(),

jadibot: `
..    ▓⃞💰 *PRICELIST JADIBOT*
✦. *Jadibot*
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Hari* :   *Rp.500*
    ·  ✦ㅤ🖇꯭  ׁ  *1 Minggu* :   *Rp.2.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Bulan* :   *Rp.5.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *6 Bulan* :   *Rp.30.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Tahun* :   *Rp.55.000*
`.trim(),

  reseller: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥*
✦. *RESELLER*
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Minggu* :   *Rp.5.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Bulan* :   *Rp.15.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *6 Bulan* :   *Rp.50.000*
`.trim(),

  bikinbot: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗕𝗜𝗞𝗜𝗡 𝗕𝗢𝗧*
✦. 𝗕𝗜𝗞𝗜𝗡 𝗕𝗢𝗧 (𝗙𝗨𝗟𝗟 𝗙𝗜𝗧𝗨𝗥)
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Minggu* :   *Rp.7.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1 Bulan* :   *Rp.20.000*
`.trim(),

  limitbikinbot: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗟𝗜𝗠𝗜𝗧 𝗕𝗜𝗞𝗜𝗡 𝗕𝗢𝗧*
✦. *𝗟𝗜𝗠𝗜𝗧 𝗕𝗜𝗞𝗜𝗡 𝗕𝗢𝗧*
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *1.000 Limit* : *Rp.5.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *2.000 Limit* : *Rp.8.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *5.000 Limit* : *Rp.16.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *10.000 Limit* : *Rp.25.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *20.000 Limit* : *Rp.40.000*
`.trim(),

  jasa: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗝𝗔𝗦𝗔*
✦. *JASA*
ㅤ    *· ✦ 🖇꯭ ׁ hias pricelist teks* : *2.000*
ㅤ    *· ✦ 🖇꯭ ׁ hias qr : START Rp.5.000*
`.trim(),

  nokos: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗡𝗢𝗞𝗢𝗦*
✦. *NOKOS*
ㅤㅤㅤ .. 📌
ㅤ    *· ✦ 🖇꯭ ׁ INDO : Rp.5.000*
ㅤ    *· ✦ 🖇꯭ ׁ LUAR : Rp.7.000 (TERGANTUNG NEGARA)*
`.trim(),

  custom: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗖𝗨𝗦𝗧𝗢𝗠 𝗙𝗜𝗧𝗨𝗥*
✦. 𝗖𝗨𝗦𝗧𝗢𝗠 𝗙𝗜𝗧𝗨𝗥
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *Harga* : *Menyesuaikan kesulitan*
`.trim(),

  panel: `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗣𝗔𝗡𝗘𝗟*
✦. *𝗣𝗔𝗡𝗘𝗟 (SERVER)*
ㅤㅤㅤ .. 📌
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *Ram 1GB* :   *Rp.1.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *Ram 2GB* :   *Rp.2.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *Ram 4GB* :   *Rp.4.000*
ㅤㅤ ·  ✦ㅤ🖇꯭  ׁ  *Ram Unlimited* : *Rp.10.000*
_(Silahkan hubungi owner untuk cek stok)_
`.trim()
};

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, sender, senderType } = messageInfo;

  // Mengambil query dari input teks persis seperti script Pinterest / TikTok kamu
  const rawQuery = content ? content.trim() : "";
  const parts = rawQuery.split(/\s+/);
  const query = parts[0] ? parts[0].toLowerCase() : "";

  let selectedText = "";

  // Cek apakah argumen pertama cocok dengan salah satu key kategori
  if (query && categories[query]) {
    selectedText = `
${categories[query]}

*─── [ INFORMASI ] ───*
​- Ingin beli? Ketik *.qris [nominal]*
​- Butuh bantuan? Ketik *.owner*
​- Semua transaksi *No Refund*.

_Hai @${sender.split("@")[0]}, harga di atas dapat berubah sewaktu-waktu._
`.trim();
  } else {
    // Jika tidak ada parameter atau parameter salah, gabungkan semua isi kategori secara otomatis
    const allCategoriesText = Object.values(categories).join("\n\n");
    
    selectedText = `
..    ▓⃞💰 *𝗣𝗥𝗜𝗖𝗘𝗟𝗜𝗦𝗧 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 𝗕𝗢𝗧*

${allCategoriesText}

*─── [ INFORMASI ] ───*
​- Ingin beli? Ketik *.qris [nominal]*
​- Butuh bantuan? Ketik *.owner*
​- Semua transaksi *No Refund*.

_Hai @${sender.split("@")[0]}, harga di atas dapat berubah sewaktu-waktu._
`.trim();
  }

  await sendMessageWithMention(
    sock,
    remoteJid,
    selectedText,
    message,
    senderType
  );
}

export default {
  handle,
  Commands: ["pricelist", "harga", "price", "pl"],
  OnlyPremium: false,
  OnlyOwner: false,
};