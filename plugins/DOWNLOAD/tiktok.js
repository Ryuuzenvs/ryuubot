import axios from "axios";
import config from "../../config.js";
import { logCustom } from "../../lib/logger.js";
import { extractLink } from "../../lib/utils.js";

// Fungsi kirim pesan dengan quote
async function sendMessageWithQuote(sock, remoteJid, message, text) {
  await sock.sendMessage(remoteJid, { text }, { quoted: message });
}

// Validasi URL TikTok
function isTikTokUrl(url) {
  return /tiktok\.com/i.test(url);
}

// Scraper Gratis TikWM (Porting dari Ourin)
async function tiktokDl(url) {
  let domain = 'https://www.tikwm.com/api/';
  let res = await (await axios.post(domain, {}, {
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': 'https://www.tikwm.com',
      'Referer': 'https://www.tikwm.com/',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    },
    params: { url: url, count: 12, cursor: 0, web: 1, hd: 1 }
  })).data.data;

  if (!res) throw new Error("Gagal mengambil data dari API TikWM");

  let data = [];
  if (res.duration === 0 || !res.duration) {
    // Jika konten berupa Slide Foto
    res.images.map(v => {
      data.push({ type: 'photo', url: v });
    });
  } else {
    // Jika konten berupa Video
    data.push(
      { type: 'watermark', url: 'https://www.tikwm.com' + res.wmplay },
      { type: 'nowatermark', url: 'https://www.tikwm.com' + res.play },
      { type: 'nowatermark_hd', url: 'https://www.tikwm.com' + res.hdplay }
    );
  }

  return {
    title: res.title,
    duration: res.duration || 0,
    data: data
  };
}

// Handler Utama Plugin
async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command } = messageInfo;

  if (!content || !content.trim()) {
    return sendMessageWithQuote(
      sock,
      remoteJid,
      message,
      `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${prefix + command} linknya*_`
    );
  }

  const validLink = extractLink(content);

  if (!isTikTokUrl(validLink)) {
    return sendMessageWithQuote(
      sock,
      remoteJid,
      message,
      "URL yang Anda masukkan tidak valid. Pastikan URL berasal dari TikTok."
    );
  }

  // Tampilkan reaksi "Loading"
  await sock.sendMessage(remoteJid, {
    react: { text: "⏰", key: message.key },
  });

  try {
    // Memanggil scraper gratisan TikWM
    const response = await tiktokDl(validLink);

    if (response.duration > 0) {
      // --- HANDLER UNTUK KONTEN VIDEO ---
      // Cari video HD terlebih dahulu, jika tidak ada pakai no_watermark biasa
      const targetVideo = response.data.find(e => e.type === "nowatermark_hd") || response.data.find(e => e.type === "nowatermark");

      if (!targetVideo || !targetVideo.url) throw new Error("URL Video tidak ditemukan.");

      // Kirim video langsung via URL streaming (Hemat RAM!)
      await sock.sendMessage(
        remoteJid,
        {
          video: { url: targetVideo.url },
          caption: response.title || "_Tanpa Caption_",
        },
        { quoted: message }
      );
    } else {
      // --- HANDLER UNTUK KONTEN SLIDE FOTO ---
      // Cek apakah base Baileys kamu mendukung fitur albumMessage (fitur baru) atau harus kirim satu-satu
      if (sock.albumMessage || typeof sock.sendMessage === 'function') {
        const imageAlbum = response.data.map(img => ({
          image: { url: img.url }
        }));

        // Mengirimkan pesan dalam bentuk album/multi-image
        await sock.sendMessage(remoteJid, {
          albumMessage: imageAlbum,
          caption: response.title || "_Tanpa Caption_" // Caption utama album
        }, { quoted: message });
      } else {
        // Fallback: Kirim gambar satu per satu jika library Baileys lawas belum support albumMessage
        for (let i = 0; i < response.data.length; i++) {
          await sock.sendMessage(remoteJid, { 
            image: { url: response.data[i].url }, 
            caption: i === 0 ? response.title : "" 
          }, { quoted: message });
        }
      }
    }

    // Ubah reaksi ke sukses
    await sock.sendMessage(remoteJid, {
      react: { text: "✅", key: message.key },
    });

  } catch (error) {
    console.error("Kesalahan saat memproses perintah TikTok:", error);
    logCustom("info", content, `ERROR-COMMAND-${command}.txt`);

    await sock.sendMessage(remoteJid, {
      react: { text: "❌", key: message.key },
    });

    const errorMessage = `⚠️ Maaf, terjadi kesalahan saat mendownload TikTok.\n\n*Detail Kesalahan:* ${error.message || error}`;
    await sendMessageWithQuote(sock, remoteJid, message, errorMessage);
  }
}

export default {
  handle,
  Commands: ["tt", "tiktok"],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 1,
};
