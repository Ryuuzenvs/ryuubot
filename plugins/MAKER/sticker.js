import { downloadQuotedMedia, downloadMedia } from "../../lib/utils.js";
import { sendImageAsSticker } from "../../lib/exif.js";
import { isOwner, isPremiumUser } from "../../lib/users.js"; // Import penentu role
import config from "../../config.js";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg"; // Untuk cek durasi video

// Helper fungsi untuk mengambil durasi video (dalam detik)
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
};

async function handle(sock, messageInfo) {
  const { remoteJid, message, type, isQuoted, prefix, command, sender } = messageInfo;

  try {
    const mediaType = isQuoted ? isQuoted.type : type;

    if (mediaType === "image" || mediaType === "video") {
      // 1. Download media terlebih dahulu ke folder tmp
      const media = isQuoted
        ? await downloadQuotedMedia(message)
        : await downloadMedia(message);

      const mediaPath = path.join("tmp", media);

      if (!fs.existsSync(mediaPath)) {
        throw new Error("File media tidak ditemukan setelah diunduh.");
      }

      // 2. Validasi Durasi jika tipenya Video
      if (mediaType === "video") {
        try {
          const duration = await getVideoDuration(mediaPath);

          // Cek Role User
          const ownerStatus = isOwner(sender);
          const premiumStatus = isPremiumUser(sender);

          if (!ownerStatus) { // Jika owner, bypass semua pengecekan
            if (premiumStatus && duration > 30) {
              fs.unlinkSync(mediaPath); // Hapus dulu biar ga menuhin storage
              return await sock.sendMessage(remoteJid, {
                text: `❌ _Gagal! Durasi video premium maksimal *30 detik*. Video kamu: *${Math.round(duration)} detik*._`
              }, { quoted: message });
            } 
            
            if (!premiumStatus && duration > 5) {
              fs.unlinkSync(mediaPath); // Hapus dulu biar ga menuhin storage
              return await sock.sendMessage(remoteJid, {
                text: `❌ _Durasi video user gratisan maksimal *5 detik*!_\n\n Upgrade ke premium untuk durasi hingga *30 detik*.`
              }, { quoted: message });
            }
          }
        } catch (err) {
          console.error("Gagal membaca durasi video:", err);
          fs.unlinkSync(mediaPath);
          return await sock.sendMessage(remoteJid, { text: "⚠️ Gagal memproses format video tersebut." }, { quoted: message });
        }
      }

      // 3. Proses Pembuatan Stiker jika lolos validasi
      const buffer = fs.readFileSync(mediaPath);

      const options = {
        packname: config.sticker_packname,
        author: config.sticker_author,
      };

      // Kirim stiker
      await sendImageAsSticker(sock, remoteJid, buffer, options, message);

      // Hapus file sementara
      fs.unlinkSync(mediaPath);
    } else {
      // Jika pesan bukan gambar atau video
      await sock.sendMessage(
        remoteJid,
        {
          text: `⚠️ _Kirim/Balas gambar/video dengan caption *${prefix + command}*_`,
        },
        { quoted: message }
      );
    }
  } catch (error) {
    console.error("Terjadi kesalahan saat memproses stiker:", error);
    await sock.sendMessage(
      remoteJid,
      { text: "Maaf, terjadi kesalahan. Coba lagi nanti!" },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["sticker", "stiker", "s"],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 1,
};
