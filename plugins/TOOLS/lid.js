import util from "util";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, args, content } = messageInfo;

  try {
    let targetJid = sender;

    // Cek apakah ada input teks setelah command
    if (content && content.trim().length > 0) {
      // Ambil hanya digit angka
      const rawInput = content.replace(/[^0-9]/g, "");

      // Validasi: nomor wajib ada dan minimal 8 digit
      if (!rawInput || rawInput.length < 8) {
        await sock.sendMessage(
          remoteJid,
          { text: "Format nomor tidak valid. Pastikan memasukkan nomor HP yang benar (min. 8 digit)." },
          { quoted: message }
        );
        return;
      }

      targetJid = `${rawInput}@s.whatsapp.net`;
    }

    // Kirim targetJid (baik dari input maupun dari pengirim)
    await sock.sendMessage(
      remoteJid,
      { text: targetJid },
      { quoted: message }
    );
    return;
  } catch (error) {
    console.error("Gagal saat cek ID:", error);
    await sock.sendMessage(
      remoteJid,
      { text: `Gagal cek ID: ${error.message}` },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["id", "debug"],
  OnlyPremium: false,
  OnlyOwner: true,
};