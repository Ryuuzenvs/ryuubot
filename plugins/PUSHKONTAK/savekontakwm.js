import fs from "fs";
import path from "path";
import { getGroupMetadata } from "../../lib/cache.js";

/**
 * Generate vCard format for a contact
 * @param {string} userId - The ID of the user (e.g., phone number or unique identifier).
 * @returns {string} - vCard formatted string.
 */
async function generateVCard(userId) {
  const number = userId.split("@")[0];
  
  // Tambahkan '+' di depan nomor agar HP tahu ini format internasional (misal: +628123...)
  const phoneNumber = number.startsWith('+') ? number : `+${number}`;
  const displayName = `Ryuubot_Pushkontak - ${number}`;

  // Format vCard versi 3.0
  const vCard = `
BEGIN:VCARD
VERSION:3.0
FN:${displayName}
TEL;TYPE=CELL:${phoneNumber}
END:VCARD
  `.trim();
  return vCard;
}

/**
 * Handle command to save group contacts into a VCF file.
 */
async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command } = messageInfo;

  try {
    // Validasi input kosong atau tidak sesuai format
    if (!content || content.trim() === "") {
      return await sock.sendMessage(
        remoteJid,
        {
          text: `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${
            prefix + command
          } xxx@g.us*_`,
        },
        { quoted: message }
      );
    }

    // Kirim reaksi sementara untuk memberikan feedback
    await sock.sendMessage(remoteJid, {
      react: { text: "⏰", key: message.key },
    });

    // Ambil metadata grup
    const Metadata = await getGroupMetadata(sock, content);
    if (!Metadata) {
      return await sock.sendMessage(
        remoteJid,
        { text: "Grup tidak ditemukan." },
        { quoted: message }
      );
    }

    // Ambil id atau phoneNumber dari peserta grup
// Ambil id atau phoneNumber dari peserta grup
const allUsers = Metadata.participants
  .map((v) => {
    // 1. Cek v.phoneNumber dulu (biasanya berisi nomor asli tanpa @s.whatsapp.net jika dia mode LID)
    if (v.phoneNumber) return v.phoneNumber;
    
    // 2. Jika tidak ada phoneNumber, baru ambil v.id nya
    return v.id;
  })
  .filter(Boolean)
  .map((id) => id.split("@")[0]) // Ambil angka depannya saja
  .filter((number) => {
    // Filter ketat: pastikan nomor Indonesia (berawalan 62) dan panjangnya normal
    return number.startsWith("62") && number.length >= 11 && number.length <= 14;
  });

    // Buat file vCard
    let textVCF = "";
    for (let user of allUsers) {
      const vCard = await generateVCard(user);
      textVCF += `${vCard}\n`;
    }

    // Pastikan folder tujuan adaMari kita buat format namanya menjadi rapi, misalnya: BotRyuu AutoSave - Member 001, BotRyuu AutoSave - Member 002, dst. Ini sangat disukai buyer karena di HP mereka nanti kontaknya akan berurutan rapi berdasarkan abjad dan nomor urut.


    const saveDir = path.join(process.cwd(), "tmp"); // Menggunakan direktori kerja saat ini
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // Simpan ke file .vcf
    const filePath = path.join(
      saveDir,
      `${content.split("@")[0]}_contacts.vcf`
    );
    fs.writeFileSync(filePath, textVCF, "utf8");

    await sock.sendMessage(
      remoteJid,
      {
        document: fs.readFileSync(filePath),
        fileName: `${content.split("@")[0]}_contacts.vcf`,
        mimetype: "text/vcard", // Atau 'text/x-vcard' jika Anda lebih suka
      },
      { quoted: message }
    );
  } catch (error) {
    console.error("Error in handle function:", error);
    await sock.sendMessage(
      remoteJid,
      { text: `_Terjadi kesalahan: ${error.message}_` },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["savekontakwm"],
  OnlyPremium: false,
  OnlyOwner: true,
};
