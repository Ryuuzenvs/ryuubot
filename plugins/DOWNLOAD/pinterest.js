import axios from "axios";
import config from "../../config.js";
import mess from "../../strings.js";
import { logCustom } from "../../lib/logger.js";

// Fungsi kirim pesan dengan quote
async function sendMessageWithQuote(sock, remoteJid, message, text) {
  await sock.sendMessage(remoteJid, { text }, { quoted: message });
}

// Fungsi utama
async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command } = messageInfo;

  try {
    const query = content.trim();
    // Validasi input
    if (!query) {
      return sendMessageWithQuote(
        sock,
        remoteJid,
        message,
        `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${prefix + command} Zhao Lusi*_`
      );
    }

    // Tampilkan reaksi loading
    await sock.sendMessage(remoteJid, {
      react: { text: "⏰", key: message.key },
    });

    // Tembak API gratis Siputzx
    const response = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`);
    const data = response.data;

    // Ambil maksimal 3 hasil teratas
    const results = data?.data?.slice(0, 3);
    if (!results || results.length === 0) {
      await sock.sendMessage(remoteJid, { react: { text: "❌", key: message.key } });
      return sendMessageWithQuote(sock, remoteJid, message, `❌ Tidak ditemukan hasil untuk: *${query}*`);
    }

    // Map data url gambar ke format Baileys (Tanpa download buffer, langsung pakai URL)
    const mediaList = results
      .filter(item => item.image_url)
      .map(item => ({
        image: { url: item.image_url }
      }));

    if (mediaList.length === 0) {
      await sock.sendMessage(remoteJid, { react: { text: "❌", key: message.key } });
      return sendMessageWithQuote(sock, remoteJid, message, "❌ Gagal memuat URL gambar.");
    }

    try {
      // 1. Coba kirim dalam bentuk Album (Fitur multi-image Baileys)
      await sock.sendMessage(remoteJid, {
        albumMessage: mediaList,
        caption: `${mess.general.success}\n\n🔍 Hasil pencarian: *${query}*`
      }, { quoted: message });

    } catch (albumError) {
      console.log('[Pinterest] Kirim album gagal, beralih kirim satu-satu:', albumError.message);

      // 2. Fallback: Kirim gambar satu per satu jika albumMessage tidak didukung
      for (let i = 0; i < mediaList.length; i++) {
        await sock.sendMessage(
          remoteJid,
          {
            image: mediaList[i].image,
            caption: i === 0 ? `${mess.general.success}\n\n🔍 Hasil pencarian: *${query}*` : ""
          },
          { quoted: message }
        );
      }
    }

    // Beri reaksi sukses jika berhasil melewati salah satu metode pengiriman di atas
    await sock.sendMessage(remoteJid, {
      react: { text: "✅", key: message.key },
    });

  } catch (error) {
    console.error("Kesalahan saat memproses perintah Pinterest:", error);
    logCustom("info", content, `ERROR-COMMAND-${command}.txt`);

    await sock.sendMessage(remoteJid, {
      react: { text: "😭", key: message.key },
    });

    const errorMessage = `⚠️ Maaf, terjadi kesalahan saat mencari gambar di Pinterest.\n\n*Detail Error:* ${error.message || error}`;
    await sendMessageWithQuote(sock, remoteJid, message, errorMessage);
  }
}

export default {
  handle,
  Commands: ["pin", "pinterest", "pins"],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 1, // Turunkan potongan limit karena sudah gratis
};
