import axios from "axios";
import config from "../../config.js"; // Tetap diimport jika dibutuhkan oleh sistem core lain
import mess from "../../strings.js";

// Fungsi untuk buat angka acak dalam range (opsional, jaga-jaga kalau endpoint butuh parameter battery)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Fungsi format waktu WIB (GMT+7)
function getWaktuIndonesia() {
  const date = new Date();
  const options = { timeZone: "Asia/Jakarta", hour12: false };
  const formatter = new Intl.DateTimeFormat("id-ID", {
    ...options,
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(date).replace(".", ":"); // Memastikan format HH:mm
}

async function handle(sock, messageInfo) {
  const {
    remoteJid,
    message,
    sender,
    content,
    isQuoted,
    prefix,
    command,
    pushName,
  } = messageInfo;

  try {
    // Ambil teks dari pesan langsung atau dari pesan yang di-quote
    const text = content && content.trim() !== "" ? content : isQuoted?.text ?? null;

    // Validasi input konten
    if (!text) {
      await sock.sendMessage(
        remoteJid,
        {
          text: `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${prefix + command} Hai manis*_`,
        },
        { quoted: message }
      );
      return;
    }

    // Kirimkan pesan loading dengan reaksi emoji
    await sock.sendMessage(remoteJid, {
      react: { text: "⏰", key: message.key },
    });

    const chatTime = getWaktuIndonesia();

    // Tembak endpoint gratis menggunakan axios untuk mengambil buffer gambar
    const url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(chatTime)}&messageText=${encodeURIComponent(text)}`;
    
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");

    // Kirim hasil gambar ke user
    await sock.sendMessage(
      remoteJid,
      {
        image: buffer,
        caption: `${mess.general.success}`,
      },
      { quoted: message }
    );

    // Kirim reaksi sukses
    await sock.sendMessage(remoteJid, {
      react: { text: "✅", key: message.key },
    });

  } catch (error) {
    console.error(error);
    
    // Kirim reaksi gagal
    await sock.sendMessage(remoteJid, {
      react: { text: "❌", key: message.key },
    });

    const errorMessage = `Maaf, terjadi kesalahan saat memproses permintaan Anda.\n\nError: ${error.message}`;
    await sock.sendMessage(
      remoteJid,
      { text: errorMessage },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["iqc", "iqchat", "iphonechat"],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 1, // Bisa diturunkan limitnya karena gratisan gas pol!
};
