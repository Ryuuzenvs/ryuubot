import axios from "axios"; // Gunakan axios untuk tembak endpoint gratis
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
          } teks animasi*_`,
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
    const sanitizedContent = encodeURIComponent(text.trim().replace(/\n+/g, " "));

    let buffer = false;
    try {
      // Menembak endpoint bratvid gratis milik Ourin via Axios
      const response = await axios.get(
        `https://api.nexray.eu.cc/maker/bratvid?text=${sanitizedContent}`,
        { responseType: "arraybuffer" } // WAJIB arraybuffer karena output-nya video/mp4 mentah
      );
      buffer = Buffer.from(response.data, "binary");
    } catch (e) {
      buffer = false;
    }

    const options = {
      packname: config.sticker_packname,
      author: config.sticker_author,
    };

    if (buffer) {
      // Kirim stiker video menggunakan buffer yang didapat
      await sendImageAsSticker(sock, remoteJid, buffer, options, message);
      
      // Berikan reaksi sukses jika berhasil terkirim
      await sock.sendMessage(remoteJid, {
        react: { text: "✅", key: message.key },
      });
    } else {
      await sock.sendMessage(
        remoteJid,
        {
          text: "Gagal mengambil data dari API BratVid. Coba lagi nanti.",
        },
        { quoted: message }
      );
    }
  } catch (error) {
    logCustom("info", content, `ERROR-COMMAND-${command}.txt`);
    const errorMessage = `Maaf, terjadi kesalahan saat memproses permintaan Anda. Coba lagi nanti.\n\nError: ${error.message}`;
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
  Commands: ["bratvid"],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 3, // Kamu bisa turunkan limitnya karena sekarang gratis!
};
