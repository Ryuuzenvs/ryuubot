import { reply } from "../../lib/utils.js";
import fs from "fs";
import path from "path";

async function handle(sock, messageInfo) {
  const { m, prefix, command, content } = messageInfo;

  // Memisahkan path file dan isi kodingan baru menggunakan delimiter '|'
  const parts = content.split("|");
  
  if (parts.length < 2) {
    return await reply(
      m,
      `⚠️ *Format Penggunaan Salah!*\n\n` +
      `💬 *Contoh Edit File:* \n_*${prefix + command} plugins/TOOLS/ping.js | <kode_baru_disini>*_\n\n` +
      `💬 *Contoh File di Folder Dalam:* \n_*${prefix + command} handle/GAMES/math.js | <kode_baru_disini>*_`
    );
  }

  // Path file target
  let targetFilePath = parts[0].trim();
  
  // Otomatis tambahkan .js jika belum ada ekstensi
  if (!path.extname(targetFilePath)) {
    targetFilePath += ".js";
  }

  // Mengambil seluruh sisa string setelah '|' pertama sebagai isi kode baru
  const newCode = parts.slice(1).join("|").trim();

  const baseDir = path.resolve(process.cwd());
  const absoluteTargetPath = path.resolve(baseDir, targetFilePath);

  // Proteksi Directory Traversal
  if (!absoluteTargetPath.startsWith(baseDir)) {
    return await reply(m, "⚠️ *Akses ditolak:* _Dilarang mengubah file di luar direktori bot._");
  }

  try {
    // Cek apakah file sudah ada sebelumnya
    const isNewFile = !fs.existsSync(absoluteTargetPath);

    // Buat folder parent jika belum ada (misal membuat folder baru secara terstruktur)
    const parentDir = path.dirname(absoluteTargetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Tulis / Menimpa (Overwrite) isi file
    fs.writeFileSync(absoluteTargetPath, newCode, "utf-8");

    const statusText = isNewFile ? "Dibuat" : "Diperbarui";
    return await reply(
      m,
      `✅ *File Berhasil ${statusText}!*\n\n` +
      `📁 *Path:* \`${targetFilePath}\`\n` +
      `📊 *Ukuran:* _${newCode.length} Karakter_\n\n` +
      `💡 _Restart bot jika perubahan membutuhkan pemuatan ulang module._`
    );

  } catch (err) {
    console.error(err);
    return await reply(m, `❌ *Gagal menyimpan file:* ${err.message}`);
  }
}

export default {
  handle,
  Commands: ["editcode", "e", "savecode"],
  OnlyPremium: false,
  OnlyOwner: true,
};
