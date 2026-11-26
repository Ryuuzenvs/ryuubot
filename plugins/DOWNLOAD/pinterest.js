import axios from "axios";
import config from "../../config.js";
import mess from "../../strings.js";
import { logCustom } from "../../lib/logger.js";
import { isOwner, isPremiumUser } from "../../lib/users.js"; // Import checker role

// Fungsi kirim pesan dengan quote
async function sendMessageWithQuote(sock, remoteJid, message, text) {
  await sock.sendMessage(remoteJid, { text }, { quoted: message });
}

// Fungsi utama
async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command, sender } = messageInfo;

  try {
    const rawQuery = content.trim();

    // Validasi input
    if (!rawQuery) {
      return sendMessageWithQuote(
        sock,
        remoteJid,
        message,
        `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${prefix + command} Zhao Lusi*_ atau _*${prefix + command} fotobunga 5*_`
      );
    }

    // --- PARSING QUERY DAN JUMLAH ---
    let query = rawQuery;
    let requestedCount = 1; // Default
    
    const parts = rawQuery.split(" ");
    const lastPart = parts[parts.length - 1];

    // Cek apakah argumen terakhir adalah angka (jumlah yang diminta)
    if (!isNaN(lastPart) && parts.length > 1) {
      requestedCount = parseInt(lastPart, 10);
      query = parts.slice(0, -1).join(" "); // Hapus angka dari query pencarian
    }

    // --- LOGIKA PEMBATASAN ROLE ---
    const isOwnerUser = isOwner(sender);
    const isPremUser = isPremiumUser(sender);

    let maxAllowed = 1; // Batas default untuk free user
    
    if (isOwnerUser) {
      maxAllowed = Infinity; 
    } else if (isPremUser) {
      maxAllowed = 10;
    }

    // Validasi jumlah permintaan
    if (requestedCount > maxAllowed) {
      const limitMsg = isPremUser 
        ? `⭐ Premium User maksimal *${maxAllowed}* gambar.` 
        : `👤 Free User maksimal *${maxAllowed}* gambar. Upgrade Premium untuk max 10 gambar.`;
      
      return sendMessageWithQuote(
        sock, 
        remoteJid, 
        message, 
        `❌ Jumlah melebihi batas.\n\n${limitMsg}`
      );
    }
    
    // Pastikan angka valid (minimal 1)
    let max_result = Math.max(1, requestedCount);

    // Tampilkan reaksi loading
    await sock.sendMessage(remoteJid, {
      react: { text: "⏰", key: message.key },
    });

    // Tembak API gratis Siputzx
    const response = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`);
    const data = response.data;

    // Ambil hasil sesuai batas (max_result)
    const results = data?.data?.slice(0, max_result);
    if (!results || results.length === 0) {
      await sock.sendMessage(remoteJid, { react: { text: "❌", key: message.key } });
      return sendMessageWithQuote(sock, remoteJid, message, `❌ Tidak ditemukan hasil untuk: *${query}*`);
    }

    // Map data url gambar ke format Baileys
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
      if (mediaList.length > 1) {
          await sock.sendMessage(remoteJid, {
            albumMessage: mediaList,
            caption: `${mess.general.success}\n\n🔍 Hasil pencarian: *${query}* (${mediaList.length} gambar)`
          }, { quoted: message });
      } else {
          // Jika cuma 1, kirim gambar biasa (album butuh >1 gambar)
          await sock.sendMessage(remoteJid, {
              image: mediaList[0].image,
              caption: `${mess.general.success}\n\n🔍 Hasil pencarian: *${query}*`
          }, { quoted: message });
      }

    } catch (albumError) {
      console.log('[Pinterest] Kirim album gagal, beralih kirim satu-satu:', albumError.message);

      // 2. Fallback: Kirim gambar satu per satu
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

    // Beri reaksi sukses
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
  limitDeduction: 1, 
};
