import fs from "fs";
import path from "path";
import mess from "../../strings.js";

// Folder direktori tempat menyimpan file sementara / transfer gambar
const STORAGE_DIR_NAME = "tmp"; 

async function handle(sock, messageInfo) {
  const { m, prefix, command, content } = messageInfo;
  
  // Penentuan folder target berdasarkan root project bot
  const baseDir = path.resolve(process.cwd());
  const targetDir = path.join(baseDir, STORAGE_DIR_NAME);

  // Buat folder 'tmp' jika belum ada
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Parameter 'list' untuk melihat isi folder
  if (!content || content.trim().toLowerCase() === "list") {
    try {
      const files = fs.readdirSync(targetDir);
      
      // Filter hanya file gambar (jpg, jpeg, png, webp)
      const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
      const imageFiles = files.filter((file) =>
        imageExtensions.includes(path.extname(file).toLowerCase())
      );

      if (imageFiles.length === 0) {
        return await sock.sendMessage(
          m.key.remoteJid,
          {
            text: `📁 *Folder \`${STORAGE_DIR_NAME}/\` kosong / Tidak ada gambar.*`,
          },
          { quoted: m }
        );
      }

      let textList = `📂 *Daftar Gambar di Folder \`${STORAGE_DIR_NAME}/\`:*\n\n`;
      imageFiles.forEach((file, index) => {
        const stats = fs.statSync(path.join(targetDir, file));
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        textList += `${index + 1}. \`${file}\` _(${fileSizeMB} MB)_\n`;
      });

      textList += `\n💬 *Contoh Kirim:* _*${prefix + command} ${imageFiles[0]}*_`;

      return await sock.sendMessage(
        m.key.remoteJid,
        { text: textList },
        { quoted: m }
      );
    } catch (err) {
      console.error(err);
      return await sock.sendMessage(
        m.key.remoteJid,
        { text: "❌ _Gagal membaca direktori server._" },
        { quoted: m }
      );
    }
  }

  // Memproses pengambilan & pengiriman gambar spesifik
  const targetPath = path.resolve(targetDir, content.trim());

  // Security Check 1: Proteksi Directory Traversal (mencegah akses keluar dari folder target)
  if (!targetPath.startsWith(targetDir)) {
    return await sock.sendMessage(
      m.key.remoteJid,
      { text: "⚠️ *Akses ditolak:* _Dilarang melakukan directory traversal._" },
      { quoted: m }
    );
  }

  // Security Check 2: Cek keberadaan file
  if (!fs.existsSync(targetPath)) {
    return await sock.sendMessage(
      m.key.remoteJid,
      { text: `⚠️ *File tidak ditemukan:* _${content}_\n\nKetik _*${prefix + command} list*_ untuk melihat daftar gambar.` },
      { quoted: m }
    );
  }

  // Validasi format ekstensi file
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(targetPath).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return await sock.sendMessage(
      m.key.remoteJid,
      { text: `⚠️ *Format file tidak didukung!* Harus berupa: _${allowedExtensions.join(", ")}_` },
      { quoted: m }
    );
  }

  try {
    // Reaksi Loading
    await sock.sendMessage(m.key.remoteJid, {
      react: { text: "⏰", key: m.key },
    });

    // Mengambil buffer file
    const imageBuffer = fs.readFileSync(targetPath);

    // Kirim gambar ke WhatsApp (Menggunakan cara sock.sendMessage image buffer)
    await sock.sendMessage(
      m.key.remoteJid,
      {
        image: imageBuffer,
        caption: `✅ *File:* \`${path.basename(targetPath)}\`\n${mess?.general?.success ?? ""}`,
      },
      { quoted: m }
    );

    // Reaksi Sukses
    return await sock.sendMessage(m.key.remoteJid, {
      react: { text: "✅", key: m.key },
    });

  } catch (error) {
    console.error(error);
    
    // Reaksi Gagal
    await sock.sendMessage(m.key.remoteJid, {
      react: { text: "❌", key: m.key },
    });

    return await sock.sendMessage(
      m.key.remoteJid,
      { text: `❌ *Gagal mengirim gambar.*\n\n*Error:* ${error.message}` },
      { quoted: m }
    );
  }
}

export default {
  handle,
  Commands: ["si", "sendimg", "sendimage"],
  OnlyPremium: false,
  OnlyOwner: true, // Diproteksi khusus Owner
};
