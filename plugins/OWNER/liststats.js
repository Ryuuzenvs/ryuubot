import { sendMessageWithMention } from "../../lib/utils.js";
import { readUsers } from "../../lib/users.js";

async function handle(sock, messageInfo) {
  // Tambahkan fallback jika args atau senderType tidak dikirim oleh handler utama
  const { remoteJid, message, senderType = "user", args = [], command } = messageInfo;

  // 1. Ambil data semua user
  const dataUsers = await readUsers();
  const allUsersArray = Object.entries(dataUsers);
  const totalUsers = allUsersArray.length;

  if (totalUsers === 0) {
    return await sock.sendMessage(remoteJid, { text: "📭 Database user masih kosong." }, { quoted: message });
  }

  // 2. Tentukan Tipe Sortir berdasarkan Command
  let statType = ""; 
  if (command === "listmoney") {
    statType = "Money 💰";
    allUsersArray.sort((a, b) => (b[1]?.money || 0) - (a[1]?.money || 0));
  } else if (command === "listlimit") {
    statType = "Limit 📊";
    allUsersArray.sort((a, b) => (b[1]?.limit || 0) - (a[1]?.limit || 0));
  } else if (command === "listpaidlimit") {
    statType = "Paid Limit 💎";
    allUsersArray.sort((a, b) => (b[1]?.paidLimit || 0) - (a[1]?.paidLimit || 0));
  }

  // 3. Pengaturan Konfigurasi Pagination
  const limitPerPage = 50; 
  const totalPages = Math.ceil(totalUsers / limitPerPage);
  
  // Ambil input halaman dengan aman menggunakan optional chaining / fallback array
  const inputPage = args && args.length > 0 ? args[0] : 1;
  let page = parseInt(inputPage) || 1;
  
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const startIndex = (page - 1) * limitPerPage;
  const endIndex = startIndex + limitPerPage;

  // Potong array user sesuai halaman aktif
  const slicedUsers = allUsersArray.slice(startIndex, endIndex);

  // 4. Mapped Menjadi Teks List
  const listText = slicedUsers
    .map(([id, user], index) => {
      if (!user || !user.aliases || !Array.isArray(user.aliases) || user.aliases.length === 0) return null;

      // Cari JID yang sesuai dengan senderType (WA biasa vs LID)
      let alias = user.aliases.find((a) => senderType === "user" ? a.endsWith("@s.whatsapp.net") : a.endsWith("@lid"));
      if (!alias) alias = user.aliases[0]; // Fallback ke alias pertama jika tidak ketemu tipe spesifik
      
      const cleanNumber = alias.split("@")[0];
      const globalIndex = startIndex + index + 1; // Nomor urut global di DB

      // Tampilkan stat nilai berdasarkan command
      let valueDisplay = 0;
      if (command === "listmoney") valueDisplay = `💰 ${user.money || 0}`;
      if (command === "listlimit") valueDisplay = `📊 ${user.limit || 0}`;
      if (command === "listpaidlimit") valueDisplay = `💎 ${user.paidLimit || 0}`;

      // Cek status Owner/Premium untuk penanda tambahan visual
      let badge = user.role === "owner" || user.role === "Owner" ? " [OWNER]" : (user.premium && new Date(user.premium) > new Date() ? " [PREM]" : "");

      return `${globalIndex}. @${cleanNumber} ➜ ${valueDisplay}${badge}`;
    })
    .filter(Boolean)
    .join("\n");

  // 5. Bungkus dalam Layout Pesan
  const header = `┏━━『 *LIST DATA USER (${statType})* 』\n┃\n`;
  const footer = `\n┃\n┣━━━━━━━━━━━━━━━━━━━\n┃ 📄 Halaman: *${page} / ${totalPages}*\n┃ 👥 Total User DB: *${totalUsers}*\n┃ 💡 _Gunakan *.${command} [angka]* untuk ke halaman lain._\n┗━━━━━━━━━━━━━━━━━━━`;

  const finalResponse = header + listText + footer;

  // Kirim dengan mention
  await sendMessageWithMention(
    sock,
    remoteJid,
    finalResponse,
    message,
    senderType
  );
}

export default {
  handle,
  Commands: ["listmoney", "listlimit", "listpaidlimit"],
  OnlyPremium: false,
  OnlyOwner: true, 
};
