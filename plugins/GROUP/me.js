import { findUser, isOwner, isPremiumUser, getOwnerDurationDetails } from "../../lib/users.js";

async function handle(sock, messageInfo) {
  // Kita ambil 'content' dari messageInfo untuk mendeteksi input tambahan
  const { remoteJid, message, sender, content } = messageInfo;

  let targetJid = sender; // Default target adalah si pengirim sendiri

  // 🔍 Cek jika ada input tambahan (nomor HP atau @tag)
  if (content && content.trim()) {
    const cleanInput = content.trim();
    
    // Jika input berupa angka saja atau ada tambahan teks (misal dari mention/manual input)
    // Fungsi findUser kamu sudah pintar mendeteksi berdasarkan username maupun nomor telepon (alias)
    const targetData = await findUser(cleanInput);

    if (!targetData) {
      return await sock.sendMessage(
        remoteJid,
        { text: `⚠️ _Pengguna dengan ID/Nomor "${cleanInput}" tidak ditemukan di database._` },
        { quoted: message }
      );
    }

    // Jika ketemu, kita ambil JID aslinya dari array aliases pengguna tersebut
    const [_, userDataFound] = targetData;
    if (userDataFound.aliases && userDataFound.aliases.length > 0) {
      targetJid = userDataFound.aliases[0]; // Set targetJid ke JID asli target
    }
  }

  // Ambil data target (bisa diri sendiri atau orang lain yang dicari)
  const dataUsers = await findUser(targetJid);
  if (!dataUsers) return;

  const [docId, userData] = dataUsers;

  const isOwnerUser = isOwner(targetJid);
  const isPrem = isPremiumUser(targetJid);

  const role = isOwnerUser
    ? "Owner"
    : isPrem
    ? "Premium"
    : userData.role;

  let premiumStatus = "Tidak Aktif";
  
  if (isOwnerUser) {
    const number = targetJid.split("@")[0];
    const ownerDuration = getOwnerDurationDetails(number);

    if (ownerDuration === "PERMANENT") {
      premiumStatus = "Permanen (Owner)";
    } else {
      const pDate = new Date(ownerDuration);
      premiumStatus = pDate.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) + " (Owner)";
    }
  } else if (isPrem && userData.premium) {
    const pDate = new Date(userData.premium);
    premiumStatus = pDate.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  let teks = `
╭─── _*PROFILE INFO*_ 
├────
├──
│ Id : ${targetJid || 0}
│ Level : *${userData.level || 0}*
│ Limit : *${userData.limit || 0}*
│ Paid Limit : *${userData.paidLimit || 0}*
│ Money : *${userData.money || 0}*
│ Role : *${role}*
│ Premium : *${premiumStatus}*
│
├────
╰────────────────────────`;

  await sock.sendMessage(remoteJid, { text: teks }, { quoted: message });
}

export default {
  handle,
  Commands: ["me", "limit", "profile"],
  OnlyPremium: false,
  OnlyOwner: false,
};
