import { sendMessageWithMention } from "../../lib/utils.js";
import { readUsers, isOwner } from "../../lib/users.js"; // Tambahkan import isOwner
import { getGroupMetadata } from "../../lib/cache.js";
import mess from "../../strings.js";

async function handle(sock, messageInfo) {
  const { remoteJid, isGroup, message, sender, senderType } = messageInfo;
  if (!isGroup) return; // Hanya untuk grup

  try {
    // Mendapatkan metadata grup
    const groupMetadata = await getGroupMetadata(sock, remoteJid);
    const participants = groupMetadata.participants;
    const isAdmin = participants.some(
      (p) => (p.phoneNumber === sender || p.id === sender) && p.admin
    );
    if (!isAdmin) {
      await sock.sendMessage(
        remoteJid,
        { text: mess.general.isAdmin },
        { quoted: message }
      );
      return;
    }

    // Baca data user dari database atau file
    const dataUsers = await readUsers();

    // Sortir berdasarkan money (paling besar di atas)
    // --- BAGIAN PERBAIKAN: FILTER OWNER ---
    const sortedUsers = Object.entries(dataUsers)
      .filter(([id, user]) => {
        // Kita cek aliases-nya, jika salah satu alias adalah Owner, maka kita buang (filter out)
        const hasOwnerAlias = user.aliases?.some(alias => isOwner(alias));
        return !hasOwnerAlias; // Hanya return yang BUKAN owner
      })
      .sort((a, b) => (b[1]?.money || 0) - (a[1]?.money || 0))
      .slice(0, 10);
    // ---------------------------------------

    const aliasList = sortedUsers
      .map(([id, user]) => {
        if (
          !user.aliases ||
          !Array.isArray(user.aliases) ||
          user.aliases.length === 0
        )
          return null;

        let alias;
        if (senderType === "user") {
          alias = user.aliases.find((a) => a.endsWith("@s.whatsapp.net"));
          if (!alias) return null;
          alias = alias.split("@")[0];
        } else {
          alias = user.aliases.find((a) => a.endsWith("@lid"));
          if (!alias) return null;
          alias = alias.split("@")[0];
        }

        return `┣ ⌬ @${alias} - 💰 Money: ${user.money}`;
      })
      .filter(Boolean)
      .join("\n");

    const textNotif = `┏━『 *TOP 10 MEMBER* 』\n┣\n${aliasList}\n┗━━━━━━━━━━━━━━━`;

    // Kirim pesan dengan mention
    await sendMessageWithMention(
      sock,
      remoteJid,
      textNotif,
      message,
      senderType
    );
  } catch (error) {
    console.error("Error in handle:", error);
    await sock.sendMessage(
      remoteJid,
      { text: "⚠️ Terjadi kesalahan saat menampilkan daftar pengguna." },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["top"],
  OnlyPremium: false,
  OnlyOwner: false,
};
