import util from "util";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, args } = messageInfo;

  try {
    let targetNumber = "";

    if (args && args.length > 0) {
      // Ambil angka murni dari input
      targetNumber = args.join("").replace(/[^0-9]/g, "");

      if (!targetNumber || targetNumber.length < 8) {
        await sock.sendMessage(
          remoteJid,
          { text: "Format nomor tidak valid. Masukkan nomor HP yang benar." },
          { quoted: message }
        );
        return;
      }
    } else {
      // Ambil angka murni dari sender JID (menghilangkan @s.whatsapp.net / @g.us)
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
  Commands: ["mynum", "getnum", "nohp", "no"],
  OnlyPremium: false,
  OnlyOwner: true,
};