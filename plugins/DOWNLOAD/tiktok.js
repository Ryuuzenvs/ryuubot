import axios from "axios";
import config from "../../config.js";
import { logCustom } from "../../lib/logger.js";
import { extractLink } from "../../lib/utils.js";
import { isOwner, isPremiumUser } from "../../lib/users.js";

// Config Batas Ukuran (MB)
const LIMIT_SIZE_FREE = config.LIMIT_SIZE_FREE || 10; // Default fallback jika undefined
const LIMIT_SIZE_PREM = config.LIMIT_SIZE_PREM || 50;

// Fungsi kirim pesan dengan quote
async function sendMessageWithQuote(sock, remoteJid, message, text) {
  await sock.sendMessage(remoteJid, { text }, { quoted: message });
}

// Validasi URL TikTok
function isTikTokUrl(url) {
  return /tiktok\.com/i.test(url);
}

// Helper untuk ambil ukuran file asli jika API mengembalikan 0
async function getRemoteFileSize(url) {
  try {
    const res = await axios.head(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
      },
      timeout: 5000
    });
    const bytes = res.headers['content-length'];
    return bytes ? parseInt(bytes, 10) : 0;
  } catch (err) {
    console.warn("[TIKTOK DEBUG] Gagal fetch Content-Length via HEAD request:", err.message);
    return 0;
  }
}

// Scraper Gratis TikWM
async function tiktokDl(url) {
  let domain = 'https://www.tikwm.com/api/';
  let response = await axios.post(domain, {}, {
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': 'https://www.tikwm.com',
      'Referer': 'https://www.tikwm.com/',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    },
    params: { url: url, count: 12, cursor: 0, web: 1, hd: 1 }
  });

  let res = response.data?.data;
  if (!res) throw new Error("Gagal mengambil data dari API TikWM");

  let data = [];
  if (res.duration === 0 || !res.duration) {
    if (Array.isArray(res.images)) {
      res.images.forEach(v => {
        data.push({ type: 'photo', url: v });
      });
    }
  } else {
    // Pastikan URL full domain
    const formatUrl = (path) => path ? (path.startsWith('http') ? path : 'https://www.tikwm.com' + path) : '';

    data.push(
      { type: 'watermark', url: formatUrl(res.wmplay), size: res.wm_size || 0 },
      { type: 'nowatermark', url: formatUrl(res.play), size: res.size || 0 },
      { type: 'nowatermark_hd', url: formatUrl(res.hdplay), size: res.hd_size || 0 }
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
      `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${prefix + command} <link_tiktok>*_\n_💬 Paksa Kirim File:_ _*${prefix + command} <link_tiktok> --swhd*_`
    );
  }

  // Cek apakah ada flag --swhd di dalam input pesan
  const args = content.trim().split(/\s+/);
  const hasSwhdFlag = args.includes("--swhd");

  // Bersihkan teks input dari flag --swhd untuk mengambil URL aslinya
  const cleanContent = args.filter(arg => arg !== "--swhd").join(" ");
  const validLink = extractLink(cleanContent);

  if (!isTikTokUrl(validLink)) {
    return sendMessageWithQuote(
      sock,
      remoteJid,
      message,
      "URL yang Anda masukkan tidak valid. Pastikan URL berasal dari TikTok."
    );
  }

  const isOwnerUser = isOwner(sender);
  const isPremUser = isPremiumUser(sender);

  // Validasi: Jika user memakai flag --swhd tapi bukan Premium/Owner, tolak / beri peringatan
  if (hasSwhdFlag && !isPremUser && !isOwnerUser) {
    return await sendMessageWithQuote(
      sock,
      remoteJid,
      message,
      `❌ Fitur parameter *--swhd* (Send Without HD/Link limit bypass) hanya khusus untuk pengguna *Premium* dan *Owner*!\n\nKetik *.harga* untuk melihat informasi upgrade.`
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
      const targetVideo = response.data.find(e => e.type === "nowatermark_hd" && e.url) || 
                          response.data.find(e => e.type === "nowatermark" && e.url);

      if (!targetVideo || !targetVideo.url) throw new Error("URL Video tidak ditemukan.");

      let rawByteSize = targetVideo.size || 0;

      // Fallback: Jika API TikWM kasih size 0, cek via HEAD request ke server
      if (rawByteSize === 0) {
        console.log(`[TIKTOK DEBUG] Size dari API 0, mencoba pengecekan Content-Length...`);
        rawByteSize = await getRemoteFileSize(targetVideo.url);
      }

      let sizeMB = rawByteSize > 0 ? (rawByteSize / (1024 * 1024)) : 0;

      let allowedSize = LIMIT_SIZE_FREE;
      if (isPremUser) allowedSize = LIMIT_SIZE_PREM;
      if (isOwnerUser) allowedSize = Infinity;

      // Log Debugging Lengkap
      console.log(`\n=== [TIKTOK DEBUG LOG] ===`);
      console.log(`User Sender   : ${sender}`);
      console.log(`Raw Size Byte : ${rawByteSize}`);
      console.log(`Calculated MB : ${sizeMB.toFixed(2)} MB`);
      console.log(`Allowed Limit : ${allowedSize} MB`);
      console.log(`Is Owner      : ${isOwnerUser}`);
      console.log(`Is Premium    : ${isPremUser}`);
      console.log(`Flag --swhd   : ${hasSwhdFlag}`);
      console.log(`=========================\n`);

      // 1. Cek Batas Limit Akun (Role User Berdasarkan Ukuran Maksimal)
      if (sizeMB > allowedSize) {
        console.log(`[TIKTOK RESULT] Blocked by Role Limit (${sizeMB.toFixed(2)} MB > ${allowedSize} MB)`);
        return await sendMessageWithQuote(
          sock,
          remoteJid,
          message,
`❌ Ukuran video terlalu besar.

📦 Ukuran Video : ${sizeMB.toFixed(2)} MB
👤 Free User : Maks ${LIMIT_SIZE_FREE} MB
⭐ Premium User : Maks ${LIMIT_SIZE_PREM} MB
👑 Owner : Unlimited

Video ini melebihi batas maksimal akun kamu.`
        );
      }

      // 2. Logika Pengiriman: 
      // Jika ukuran > 5MB, biasanya dikirim link saja KECUALI user premium/owner menyertakan flag `--swhd`
      if (sizeMB > 5 && !hasSwhdFlag) {
        console.log(`[TIKTOK RESULT] Sending URL Link only (${sizeMB.toFixed(2)} MB > 5 MB, --swhd is false)`);
        const linkCaption = `📌 *TikTok Downloader*\n\n` +
          `📄 *Judul:* ${response.title || '-'}\n` +
          `📦 *Ukuran File:* ${sizeMB.toFixed(2)} MB\n\n` +
          `⚠️ *Ukuran video lebih dari 5 MB.* File dikirim berupa link untuk menghemat RAM.\n` +
          `💡 _Tips khusus Premium/Owner:_ Ketik dengan tambahan *--swhd* di akhir perintah jika ingin bot tetap mendownload & mengirim file videonya langsung.\n\n` +
          `🔗 *Download Video via Link:* \n${targetVideo.url}`;

        return await sendMessageWithQuote(sock, remoteJid, message, linkCaption);
      }

      // 3. Kirim Video Langsung (Kondisi: Ukuran <= 5MB ATAU ukuran > 5MB tapi flag --swhd aktif oleh Premium/Owner)
      console.log(`[TIKTOK RESULT] Sending Video File Directly (${sizeMB.toFixed(2)} MB, Force Send via --swhd: ${hasSwhdFlag})`);
      await sock.sendMessage(
        remoteJid,
        {
          video: { url: targetVideo.url },
          caption: (response.title || "_Tanpa Caption_") + (hasSwhdFlag ? `\n\n_⚡ [Sent via --swhd bypass]_` : ""),
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
