import { convertToJid } from "../../lib/utils.js";
import { findUser } from "../../lib/users.js";
import { getCouple, getPendingCouple, sendCoupleRequest } from "../../lib/couple.js";
console.log("🔥 Plugin nembak.js berhasil di-load!");

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, sender, prefix, command } = messageInfo;

  if (!content || content.trim() === "") {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Format salah! Contoh: *${prefix + command} @tag*_` },
      { quoted: message }
    );
  }

  const targetInput = content.trim().split(/\s+/)[0];
  const targetJid = await convertToJid(sock, targetInput);

  if (!targetJid) {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _User tidak ditemukan, pastikan target sudah aktif/chat di grup ini!_` },
      { quoted: message }
    );
  }

  if (targetJid === sender) {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Mana bisa kamu berpacaran dengan diri sendiri! Jomblo banget ya? 😂_` },
      { quoted: message }
    );
  }

  // Cek status pengirim
  if (getCouple(sender)) {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Kamu sudah punya pacar! Setia dong, jangan mendua._` },
      { quoted: message }
    );
  }
  if (getPendingCouple(sender)) {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Kamu sedang memiliki permintaan pacaran yang tertunda (pending). Selesaikan dulu!_` },
      { quoted: message }
    );
  }

  // Cek status target
  if (getCouple(targetJid)) {
    return await sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Kasihan, orang yang kamu tembak sudah punya pasangan! 💔_` },
      { quoted: message }
    );
  }

  // Simpan request ke database couple (pending)
  sendCoupleRequest(sender, targetJid);

  const senderClean = sender.split("@")[0];
  const targetClean = targetJid.split("@")[0];

  const text = `@${senderClean} sedang menyatakan cinta kepada @${targetClean} ❤️\n\n_Balas pesan ini atau ketik_ *.terima* _untuk menerima atau_ *.tolak* _untuk menolak._`;

  await sock.sendMessage(
    remoteJid,
    {
      text,
      contextInfo: { mentionedJid: [sender, targetJid] },
    },
    { quoted: message }
  );
}

export default {
  handle,
  Commands: ["nembak", "pacari", "tembak"],
  OnlyPremium: false,
  OnlyOwner: false,
};
