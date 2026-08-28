import util from "util";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, content } = messageInfo;

  try {
    let targetNumber = "";

    if (content && content.trim().length > 0) {
      // Ambil angka murni dari input chat
      targetNumber = content.replace(/[^0-9]/g, "");

      if (!targetNumber || targetNumber.length < 8) {
        await sock.sendMessage(
          remoteJid,
          { text: "Format nomor tidak valid. Masukkan nomor HP yang benar (min. 8 digit)." },
          { quoted: message }
        );
        return;
      }
    } else {
      // Ambil angka murni dari sender JID (membersihkan domain & karakter non-digit)
      targetNumber = sender.split("@")[0].replace(/[^0-9]/g, "");
    }

    await sock.sendMessage(
      remoteJid,
      { text: targetNumber },
      { quoted: message }
    );
    return;
  } catch (error) {
    console.error("Gagal saat cek nomor:", error);
    await sock.sendMessage(
      remoteJid,
      { text: `Gagal cek nomor: ${error.message}` },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["mynum", "getnum", "nohp"],
  OnlyPremium: false,
  OnlyOwner: true,
};