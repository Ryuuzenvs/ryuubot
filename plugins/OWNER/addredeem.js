import config from "../../config.js";
import fs from "fs";
import { reply } from "../../lib/utils.js"; 
const dbPath = "./database/redeem.json";

async function handle(sock, messageInfo) {
  const { m, remoteJid, message, content, prefix, command, sender } = messageInfo;

  // --- VALIDASI OWNER CONFIG ---
  if (!sender) return;
  const senderNumber = sender.split("@")[0];
  const ownerConfigList = config.owner_number || [];

  if (!ownerConfigList.includes(senderNumber)) {
    return await reply(
      m,
      `🚫 *Akses Ditolak:* Fitur ini hanya dapat digunakan oleh Founder Owner.`
    );
  }
  // --------------------------------------------

  if (!content?.trim()) {
    return sock.sendMessage(remoteJid, { 
      text: `⚠️ Format: *${prefix + command} KODE STOK*\nContoh: *${prefix + command} HADIAH123 5*` 
    }, { quoted: message });
  }

  const [code, stock] = content.split(" ");
  if (!code || isNaN(parseInt(stock))) {
    return sock.sendMessage(remoteJid, { text: "⚠️ Masukkan kode dan stok (angka)!" }, { quoted: message });
  }

  // --- SAFE LOAD DATABASE ---
  let db = [];
  if (fs.existsSync(dbPath)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      db = Array.isArray(fileData) ? fileData : [];
    } catch (e) {
      db = [];
    }
  }
  
  // Cek kalau kode sudah ada
  if (db.find(c => c.code === code.toUpperCase())) {
    return sock.sendMessage(remoteJid, { text: "❌ Kode tersebut sudah ada!" }, { quoted: message });
  }

  db.push({
    code: code.toUpperCase(),
    stock: parseInt(stock),
    claimedBy: [], 
    createdAt: Date.now()
  });

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  await sock.sendMessage(remoteJid, { 
    text: `✅ *KODE REDEEM BERHASIL DIBUAT*\n\n🎫 Kode: *${code.toUpperCase()}*\n📦 Stok: *${stock}*` 
  }, { quoted: message });
}

export default {
  handle,
  Commands: ["addredeem"],
  OnlyOwner: true,
};
