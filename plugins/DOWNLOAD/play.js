import yts from 'yt-search';
import axios from 'axios';
import config from '../../config.js';
import { logCustom } from '../../lib/logger.js';

// Fungsi kirim pesan dengan quote
async function sendMessageWithQuote(sock, remoteJid, message, text) {
  return sock.sendMessage(remoteJid, { text }, { quoted: message });
}

// Fungsi kirim reaksi
async function sendReaction(sock, message, reaction) {
  return sock.sendMessage(message.key.remoteJid, {
    react: { text: reaction, key: message.key },
  });
}

// Fungsi pencarian YouTube
async function searchYouTube(query) {
  const searchResults = await yts(query);
  return searchResults.all.find((item) => item.type === 'video') || searchResults.all[0];
}

// Fungsi utama
async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command } = messageInfo;

  try {
    const query = content.trim();
    if (!query) {
      return sendMessageWithQuote(
        sock,
        remoteJid,
        message,
        `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${prefix + command} matahariku*_`,
      );
    }

    // Beri reaksi sedang memproses
    await sendReaction(sock, message, '⏰');

    // Pencarian YouTube
    const video = await searchYouTube(query);

    if (!video || !video.url) {
      await sendReaction(sock, message, '❌');
      return sendMessageWithQuote(sock, remoteJid, message, '⛔ _Tidak dapat menemukan video yang sesuai_');
    }

    // Batasi durasi maksimal 1 jam (3600 detik) demi keamanan resource
    if (video.seconds > 3600) {
      await sendReaction(sock, message, '❌');
      return sendMessageWithQuote(sock, remoteJid, message, '_Maaf, durasi video terlalu panjang (maksimal 1 jam)._');
    }

    const caption = `*YOUTUBE DOWNLOADER*\n\n◧ Title: ${video.title}\n◧ Duration: ${video.timestamp}\n◧ Uploaded: ${video.ago}\n◧ Views: ${video.views}\n◧ Description: ${video.description || '-'}`;

    // Tembak API Nexray Gratisan milik Zann
    const { data } = await axios.get(`https://api.nexray.web.id/downloader/ytmp3?url=${encodeURIComponent(video.url)}`);

    if (!data || !data.result || !data.result.url) {
      throw new Error("Gagal mendapatkan URL audio dari API Nexray.");
    }

    const audioUrl = data.result.url;

    // 1. Kirim info text beserta Thumbnail Video terlebih dahulu
    await sock.sendMessage(
      remoteJid,
      { image: { url: video.thumbnail }, caption },
      { quoted: message },
    );

    // 2. Kirim File Audio dengan tampilan Audio Card (contextInfo) mewah ala iPhone/Spotify
    // JIKA MAU JADI VOICE NOTE (VN):
    // 2. Kirim File Audio sebagai MP3 biasa (Tanpa PTT, Tanpa ContextInfo ribet)
    await sock.sendMessage(
      remoteJid,
      {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg', // Kembali ke mpeg agar cocok dengan output API Nexray
        ptt: false,             // Matikan fitur VN agar tidak merusak file
        fileName: `${video.title}.mp3`,
      },
      { quoted: message },
    );

    // Beri reaksi sukses
    await sendReaction(sock, message, '✅');

  } catch (error) {
    console.error('Error while handling command:', error);
    logCustom('info', content, `ERROR-COMMAND-${command}.txt`);
    
    await sendReaction(sock, message, '😭');

    const errorMessage = `⚠️ Maaf, terjadi kesalahan saat memproses permintaan Anda.\n\n💡 Detail: ${error.message || error}`;
    await sendMessageWithQuote(sock, remoteJid, message, errorMessage);
  }
}

export default {
  handle,
  Commands: ['play', 'playaudio'],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 1, // Potongan limit dikurangi karena gratis tis tis!
};
