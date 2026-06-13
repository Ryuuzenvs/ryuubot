import fs from 'fs';
import { downloadQuotedMedia, downloadMedia } from '../../lib/utils.js';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';

async function sendError(sock, remoteJid, message, errorMessage) {
  await sock.sendMessage(remoteJid, { text: errorMessage }, { quoted: message });
}

async function handle(sock, messageInfo) {
  // Ambil data sender dari messageInfo
  const { remoteJid, message, prefix, command, isQuoted, type, sender } = messageInfo;
  const mediaType = isQuoted ? isQuoted.type : type;

  try {
    // Validasi tipe media
    if (!['image', 'sticker'].includes(mediaType)) {
      return sendError(
        sock,
        remoteJid,
        message,
        `⚠️ _Kirim/Balas gambar/stiker dengan caption *${prefix + command}*_`,
      );
    }

    // Mengambil nomor WA sender saja (menghilangkan @s.whatsapp.net)
    const senderNumber = sender.split('@')[0];

    // Set otomatis packname dan author menggunakan nomor sender
    const packname = `Sticker By ${senderNumber}`;
    const author = 'RyuuBot';

    // Unduh media
    const mediaPath = `./tmp/${
      isQuoted ? await downloadQuotedMedia(message) : await downloadMedia(message)
    }`;

    if (!fs.existsSync(mediaPath)) {
      throw new Error('File media tidak ditemukan setelah diunduh.');
    }

    // Buat stiker dengan watermark otomatis dari sender
    const sticker = new Sticker(mediaPath, {
      pack: packname,
      author: author,
      type: StickerTypes.FULL,
      quality: 50,
    });

    const buffer = await sticker.toBuffer();
    await sock.sendMessage(remoteJid, { sticker: buffer });
    
    // Hapus file temporary setelah selesai digunakan agar storage tidak penuh (Good Practice)
    if (fs.existsSync(mediaPath)) {
      fs.unlinkSync(mediaPath);
    }

  } catch (error) {
    await sendError(
      sock,
      remoteJid,
      message,
      `Maaf, terjadi kesalahan saat memproses permintaan Anda. Coba lagi nanti.\n\nError: ${error.message}`,
    );
  }
}

export default {
  handle,
  Commands: ['wm'],
  OnlyPremium: true,
  OnlyOwner: false,
  limitDeduction: 3,
};
