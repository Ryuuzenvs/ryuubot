import { findUser, isOwner, isPremiumUser, getOwnerDurationDetails } from "../../lib/users.js";
import { getCouple, hitungTotalDurasiCouple } from "../../lib/couple.js";
import config from "../../config.js"; // 👈 Import config untuk cek Founder/Developer

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, content } = messageInfo;

  let targetJid = sender;

  if (content && content.trim()) {
    const cleanInput = content.trim();
    const targetData = await findUser(cleanInput);

    if (!targetData) {
      return await sock.sendMessage(
        remoteJid,
        { text: `⚠️ _Pengguna dengan ID/Nomor "${cleanInput}" tidak ditemukan di database._` },
        { quoted: message }
      );
    }

    const [_, userDataFound] = targetData;
    if (userDataFound.aliases && userDataFound.aliases.length > 0) {
      targetJid = userDataFound.aliases[0];
    }
  }

  const dataUsers = await findUser(targetJid);
  if (!dataUsers) return;

  const [docId, userData] = dataUsers;

  // --- CEK ROLE TINGKATAN ---
  const targetNumber = targetJid.split("@")[0];
  const ownerConfigList = config.owner_number || [];
  const isFounder = ownerConfigList.includes(targetNumber); // Founder utama (berdasarkan config.js)
  const isOwnerUser = isOwner(targetJid);                    // Owner umum
  const isPrem = isPremiumUser(targetJid);                   // Premium user

  const role = isFounder
    ? "Founder"
    : isOwnerUser
    ? "Owner"
    : isPrem
    ? "Premium"
    : userData.role;

  let premiumStatus = "Tidak Aktif";
  
  if (isFounder || isOwnerUser) {
    const ownerDuration = getOwnerDurationDetails(targetNumber);

    if (ownerDuration === "PERMANENT" || isFounder) {
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

  // 🔍 Cek status pasangan & hitung durasi pacaran
  const userAliases = userData.aliases || [targetJid];
  let coupleData = null;
  for (const alias of userAliases) {
    coupleData = getCouple(alias);
    if (coupleData) break;
  }

  let coupleStatus = "Single 😭";
  let coupleDurationText = "";
  let mentionedJidList = [targetJid];

  if (coupleData) {
    const partnerJid = coupleData.user1 === targetJid || coupleData.user1 === userAliases.find(a => coupleData.user1 === a) 
      ? coupleData.user2 
      : coupleData.user1;
      
    const partnerNumber = partnerJid.split("@")[0];
    const durasi = hitungTotalDurasiCouple(coupleData.acceptedAt);
    
    coupleStatus = `Berpacaran dengan @${partnerNumber}`;
    coupleDurationText = durasi;
    mentionedJidList.push(partnerJid);
  }

  // --- PEMBUATAN TEKS BERDASARKAN TINGKATAN ROLE ---
  let teks = "";

  if (isFounder) {
    // 1. TAMPILAN FOUNDER / DEVELOPER
    teks = `╔═══════ ೋღ 👑 ღೋ ═══════╗
       𓆩 *FOUNDER PROFILE* 𓆪
╚══════════════════════╝
╔═「 ♛ IDENTITY ♛ 」
║
╠➤ Id : ${targetJid || 0}
╠➤ Level : *∞*
╠➤ Limit : *∞*
╠➤ Paid Limit : *∞*
╠➤ Money : *∞*
║
╠═「 ♛ ACCOUNT STATUS ♛ 」
╠➤ Premium : *∞*
╠➤ Status : *${coupleStatus}*` + (coupleData ? `\n╠➤ Durasi : *${coupleDurationText}* 💕` : ``) + `
║
╚══════ ♛ *ROYAL OWNER* ♛ ══════╝`;

  } else if (isOwnerUser) {
    // 2. TAMPILAN OWNER BIASA
    teks = `╭━━━ ⋆｡°✩ 💎 ✩°｡⋆ ━━━╮
        𓆩 *OWNER PROFILE* 𓆪
╰━━━━━━━━━━━━━━━━━━╯
┌─「 ✦ PERSONAL DATA 」
│
├─ ◈ Id : ${targetJid || 0}
├─ ◈ Level : *${userData.level || 0}*
├─ ◈ Limit : *${userData.limit || 0}*
├─ ◈ Paid Limit : *${userData.paidLimit || 0}*
├─ ◈ Money : *${userData.money || 0}*
│
├─「 ✦ STATUS 」
├─ ◈ Premium : *${premiumStatus}*
├─ ◈ Status : *${coupleStatus}*` + (coupleData ? `\n├─ ◈ Durasi : *${coupleDurationText}* 💕` : ``) + `
│
╰━━━ ✧ *EXCLUSIVE ACCESS* ✧ ━━━╯`;

  } else if (isPrem) {
    // 3. TAMPILAN PREMIUM USER
    teks = `꧁༺━━━━━━━━━━━━━━━━༻꧂
    ✦ *PREMIUM ELITE MEMBER* ✦
╭━━━♛━━━━━━━━━━━━♛━━━╮
┃
┃  ♜ Id      : ${targetJid || 0}
┃  ♜ Level   : *${userData.level || 0}*
┃  ♜ Limit   : *∞*
┃  ♜ Paid    : *${userData.paidLimit || 0}*
┃  ♜ Money   : *${userData.money || 0}*
┃  ♜ Premium : *${premiumStatus}*
┃  ♜ Status  : *${coupleStatus}*` + (coupleData ? `\n┃  ♜ Durasi  : *${coupleDurationText}* 💕` : ``) + `
┃
╰━━━♛━━━━━━━━━━━━♛━━━╯
꧁༺━━━━━━━━━━━━━━━━༻꧂`;

  } else {
    // 4. TAMPILAN MEMBER REGULER (DEFAULT)
    teks = `
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
│ Status : *${coupleStatus}*` + (coupleData ? `\n│ Durasi : *${coupleDurationText}* 💕` : ``) + `
│
├────
╰────────────────────────`;
  }

  await sock.sendMessage(
    remoteJid, 
    { 
      text: teks.trim(),
      contextInfo: { 
        mentionedJid: mentionedJidList 
      }
    }, 
    { quoted: message }
  );
}

export default {
  handle,
  Commands: ["me", "limit", "profile"],
  OnlyPremium: false,
  OnlyOwner: false,
};