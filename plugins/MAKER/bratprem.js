import axios from "axios"; // Tambahkan axios untuk fetch buffer dari URL baru
import config from "../../config.js";
import { sendImageAsSticker } from "../../lib/exif.js";
import { logCustom } from "../../lib/logger.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, isQuoted, prefix, command } =
    messageInfo;

  try {
    const text =
      content && content.trim() !== "" ? content : isQuoted?.text ?? null;

    // Validasi input konten
    if (!text) {
      await sock.sendMessage(
        remoteJid,
        {
          text: `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${
            prefix + command
          } resbot*_`,
        },
        { quoted: message }
      );
      return; 
    }

    // Kirimkan pesan loading dengan reaksi emoji
    await sock.sendMessage(remoteJid, {
      react: { text: "⏰", key: message.key },
    });

    // Bersihkan konten & encode agar aman di URL
    const sanitizedContent = encodeURIComponent(text.trim());

    let buffer = false;
    try {
  // Nembak microservice lokal kamu di port 3001
  const response = await axios.get(`http://localhost:3001/api/brat?text=${sanitizedContent}`);
  
  if (response.data && response.data.status) {
    // Convert Base64 dari response JSON kembali menjadi Buffer
    const base64Data = response.data.result.base64.replace(/^data:image\/png;base64,/, "");
    buffer = Buffer.from(base64Data, "base64");
  }
} catch (e) {
  console.error("Gagal panggil Brat Local API:", e.message);
  buffer = false;
}
    const options = {
      packname: config.sticker_packname,
      author: config.sticker_author,
    };

    if (buffer) {
      // Kirim stiker menggunakan buffer yang didapat
      await sendImageAsSticker(sock, remoteJid, buffer, options, message);
      
      // Kirim reaksi sukses jika stiker berhasil dikirim
      await sock.sendMessage(remoteJid, {
        react: { text: "✅", key: message.key },
      });
    } else {
      await sock.sendMessage(
        remoteJid,
        {
          text: "Gagal mengambil data dari API Brat.",
        },
        { quoted: message }
      );
    }
  } catch (error) {
    logCustom("info", content, `ERROR-COMMAND-${command}.txt`);
    const errorMessage = `Maaf, terjadi kesalahan saat memproses permintaan Anda.\n\nError: ${error.message}`;
    await sock.sendMessage(
      remoteJid,
      {
        text: errorMessage,
      },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["brat1", "bratprem"],
  OnlyPremium: true,
  OnlyOwner: false,
  limitDeduction: 0,
};
