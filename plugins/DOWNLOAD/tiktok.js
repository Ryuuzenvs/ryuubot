import axios from "axios";
import config from "../../config.js";
import { logCustom } from "../../lib/logger.js";
import { extractLink } from "../../lib/utils.js";
import { isOwner, isPremiumUser } from "../../lib/users.js";

// Config Batas Ukuran (MB)
const LIMIT_SIZE_FREE = 1; // MB
const LIMIT_SIZE_PREM = 50; // MB

// Fungsi kirim pesan dengan quote
async function sendMessageWithQuote(sock, remoteJid, message, text) {
  await sock.sendMessage(remoteJid, { text }, { quoted: message });
}

// Validasi URL TikTok
function isTikTokUrl(url) {
  return /tiktok\.com/i.test(url);
}

// Scraper Gratis TikWM
async function tiktokDl(url) {
  let domain = 'https://www.tikwm.com/api/';
  let res = await (await axios.post(domain, {}, {
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': 'https://www.tikwm.com',
      'Referer': 'https://www.tikwm.com/',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    },
    params: { url: url, count: 12, cursor: 0, web: 1, hd: 1 }
  })).data.data;

  if (!res) throw new Error("Gagal mengambil data dari API TikWM");

  let data = [];
  if (res.duration === 0 || !res.duration) {
    res.images.map(v => {
      data.push({ type: 'photo', url: v });
    });
  } else {
    data.push(
      { type: 'watermark', url: 'https://www.tikwm.com' + res.wmplay, size: res.wm_size || 0 },
      { type: 'nowatermark', url: 'https://www.tikwm.com' + res.play, size: res.size || 0 },
      { type: 'nowatermark_hd', url: 'https://www.tikwm.com' + res.hdplay, size: res.hd_size || 0 }
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
  const {
    remoteJid,
    message,
    content,
    prefix,
    command,
    sender
  } = messageInfo;

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

  // Reaksi "Loading"
  await sock.sendMessage(remoteJid, {
    react: { text: "⏰", key: message.key },
  });

  try {
    const response = await tiktokDl(validLink);

    if (response.duration > 0) {
      // --- HANDLER UNTUK KONTEN VIDEO ---
      const targetVideo = response.data.find(e => e.type === "nowatermark_hd") || response.data.find(e => e.type === "nowatermark");

      if (!targetVideo || !targetVideo.url) throw new Error("URL Video tidak ditemukan.");

      // Hitung ukuran file langsung dari data byte API TikWM (Gunakan `let`)
      let sizeMB = targetVideo.size ? (targetVideo.size / (1024 * 1024)) : 0;

      const isOwnerUser = isOwner(sender);
      const isPremUser = isPremiumUser(sender);

      let allowedSize = LIMIT_SIZE_FREE;
      if (isPremUser) allowedSize = LIMIT_SIZE_PREM;
      if (isOwnerUser) allowedSize = Infinity;

      // Log Ringkas
      console.log(`[TIKTOK LIMIT] User: ${sender.split('@')[0]} | Size: ${sizeMB.toFixed(2)} MB | Limit: ${allowedSize} MB`);

      if (sizeMB > allowedSize) {
        return await sendMessageWithQuote(
          sock,
          remoteJid,
          message,
`❌ Ukuran video terlalu besar.

📦 Ukuran Video : ${sizeMB.toFixed(2)} MB

👤 Free User : Maks ${LIMIT_SIZE_FREE} MB
⭐ Premium User : Maks ${LIMIT_SIZE_PREM} MB
👑 Owner : Unlimited

Video ini melebihi batas akun kamu.

Ketik *.harga* untuk melihat paket premium dan owner.`
        );
      }

      // Kirim video
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
      if (sock.albumMessage || typeof sock.sendMessage === 'function') {
        const imageAlbum = response.data.map(img => ({
          image: { url: img.url }
        }));

        await sock.sendMessage(remoteJid, {
          albumMessage: imageAlbum,
          caption: response.title || "_Tanpa Caption_"
        }, { quoted: message });
      } else {
        for (let i = 0; i < response.data.length; i++) {
          await sock.sendMessage(remoteJid, { 
            image: { url: response.data[i].url }, 
            caption: i === 0 ? response.title : "" 
          }, { quoted: message });
        }
      }
    }

    // Reaksi Sukses
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
