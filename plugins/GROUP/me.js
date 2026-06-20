import { findUser, isOwner, isPremiumUser, getOwnerDurationDetails } from "../../lib/users.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender } = messageInfo;

  const dataUsers = await findUser(sender);
  if (!dataUsers) return;

  const [docId, userData] = dataUsers;

  const isOwnerUser = isOwner(sender);
  const isPrem = isPremiumUser(sender);

  const role = isOwnerUser
    ? "Owner"
    : isPrem
    ? "Premium"
    : userData.role;

  let premiumStatus = "Tidak Aktif";
  
  if (isOwnerUser) {
    const number = sender.split("@")[0];
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
╭─── _*MY PROFILE*_ 
├────
├──
│ Id : ${sender || 0}
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
