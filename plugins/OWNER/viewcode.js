import { reply } from "../../lib/utils.js";
import fs from "fs";
import path from "path";

// Fungsi pembantu untuk merender struktur folder & file berbentuk Tree
function renderDirectoryTree(dirPath, relativePath = "", depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return "";
  
  let result = "";
  const items = fs.readdirSync(dirPath);

  // Folder/file yang dibahasakan untuk diabaikan agar output tidak melimpah
  const ignored = [
    "node_modules", ".git", "session", "tmp", 
    "backupplugin", "database.example", ".npm"
  ];

  const filteredItems = items.filter((item) => !ignored.includes(item));

  filteredItems.forEach((item, index) => {
    const fullPath = path.join(dirPath, item);
    const relPath = path.join(relativePath, item);
    const isLast = index === filteredItems.length - 1;
    const prefix = "│  ".repeat(depth) + (isLast ? "└── " : "├── ");

    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch {
      return;
    }

    if (stats.isDirectory()) {
      result += `${prefix}📁 *${item}/*\n`;
      result += renderDirectoryTree(fullPath, relPath, depth + 1, maxDepth);
    } else if (item.endsWith(".js") || item.endsWith(".json") || item.endsWith(".txt")) {
      // Menampilkan file .js, .json, dan .txt
      result += `${prefix}📄 \`${item}\`\n`;
    }
  });

  return result;
}

async function handle(sock, messageInfo) {
  const { m, prefix, command, content } = messageInfo;

  const baseDir = path.resolve(process.cwd());
  const inputPath = content ? content.trim() : "";
  const targetPath = path.resolve(baseDir, inputPath);

  // Proteksi Directory Traversal (Tidak bisa keluar dari root project)
  if (!targetPath.startsWith(baseDir)) {
    return await reply(m, "⚠️ *Akses ditolak:* _Path berada di luar folder kerja bot._");
  }

  // Jika file/folder tidak ditemukan
  if (!fs.existsSync(targetPath)) {
    return await reply(
      m,
      `⚠️ *Path tidak ditemukan:* _${inputPath}_\n\n💡 _Gunakan \`${prefix + command} .\` untuk melihat struktur root._`
    );
  }

  try {
    const stats = fs.statSync(targetPath);

    // BILA TARGET ADALAH DIREKTORI / FOLDER (Tampilkan Tree View)
    if (stats.isDirectory()) {
      const displayPath = inputPath === "" || inputPath === "." ? "/" : `./${inputPath}`;
      let treeOutput = `📂 *Directory Tree:* \`${displayPath}\`\n\n`;
      treeOutput += renderDirectoryTree(targetPath);
      
      treeOutput += `\n💬 *Cara buka file:* _*${prefix + command} ${inputPath ? inputPath + "/" : ""}nama_file.js*_`;

      return await reply(m, treeOutput);
    }

    // BILA TARGET ADALAH FILE
    const fileContent = fs.readFileSync(targetPath, "utf-8");

    // Jika isi file lebih dari 4000 karakter, kirim sebagai dokumen
    if (fileContent.length > 4000) {
      await reply(m, `📄 _File *${path.basename(targetPath)}* terlalu panjang (${fileContent.length} karakter), mengunduh sebagai dokumen..._`);
      return await sock.sendMessage(
        m.key.remoteJid,
        {
          document: fs.readFileSync(targetPath),
          fileName: path.basename(targetPath),
          mimetype: "text/javascript",
        },
        { quoted: m }
      );
    }

    // Kirim isi file sebagai format kodingan
    return await reply(
      m,
      `📄 *File:* \`${inputPath}\`\n\n\`\`\`javascript\n${fileContent}\n\`\`\``
    );

  } catch (err) {
    console.error(err);
    return await reply(m, `❌ *Gagal membaca target:* ${err.message}`);
  }
}

export default {
  handle,
  Commands: ["viewcode", "v"],
  OnlyPremium: false,
  OnlyOwner: true,
};
