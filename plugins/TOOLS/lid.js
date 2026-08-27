import util from "util";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, args } = messageInfo;

  try {
    let targetJid = sender;

    if (args && args.length > 0) {
      // Ambil seluruh input teks dan bersihkan karakter non-digit
      const rawInput = args.join("").replace(/[^0-9]/g, "");

      // Validasi: pastikan input berupa angka dan minimal 8 digit (panjang standar no HP)
      if (!rawInput || rawInput.length < 8) {
        await sock.sendMessage(
          remoteJid,
          { text: "Format nomor tidak valid. Pastikan memasukkan nomor HP yang benar." },
          { quoted: message }
        );
        return;
      }

      targetJid = `${rawInput}@s.whatsapp.net`;
    }

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