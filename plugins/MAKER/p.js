import { sendImageAsSticker } from "../../lib/exif.js";
import config from "../../config.js";
import fs from "fs";
import path from "path";

async function handle(sock, messageInfo) {
  const { remoteJid, message, prefix, command } = messageInfo;

  try {
    // Tentukan path file target di dalam folder database
    // Anda bisa mengubah nama file atau formatnya (misal: .jpg, .png, dll.)
    const filePath = path.join("database", "stikerproses.png");

    // Cek apakah file gambar tersebut benar-benar ada
    if (!fs.existsSync(filePath)) {
      return await sock.sendMessage(
        remoteJid,
        { text: `⚠️ _File database/stikerproses.png tidak ditemukan di server._` },
        { quoted: message }
      );
    }

    // Baca file gambar ke dalam bentuk Buffer
    const buffer = fs.readFileSync(filePath);

    // Konfigurasi metadata stiker dari config utama
    const options = {
      packname: config.sticker_packname,
      author: config.sticker_author,
    };

    // Kirim buffer gambar sebagai stiker
    await sendImageAsSticker(sock, remoteJid, buffer, options, message);

  } catch (error) {
    console.error("Terjadi kesalahan saat memproses stiker dari database:", error);
    await sock.sendMessage(
      remoteJid,
      { text: "❌ _Maaf, terjadi kesalahan saat mengubah file database menjadi stiker._" },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["process", "stikerproses", "p", "setp"],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 1,
};
