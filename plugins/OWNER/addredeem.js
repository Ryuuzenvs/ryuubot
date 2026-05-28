import fs from "fs";
const dbPath = "./database/redeem.json";

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command } = messageInfo;

  if (!content?.trim()) {
    return sock.sendMessage(remoteJid, { 
      text: `⚠️ Format: *${prefix + command} KODE STOK*\nContoh: *${prefix + command} HADIAH123 5*` 
    }, { quoted: message });
  }

  const [code, stock] = content.split(" ");
  if (!code || isNaN(parseInt(stock))) {
    return sock.sendMessage(remoteJid, { text: "⚠️ Masukkan kode dan stok (angka)!" }, { quoted: message });
  }

  const db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf-8")) : [];
  
  // Cek kalau kode sudah ada
  if (db.find(c => c.code === code.toUpperCase())) {
    return sock.sendMessage(remoteJid, { text: "❌ Kode tersebut sudah ada!" }, { quoted: message });
  }

  db.push({
    code: code.toUpperCase(),
    stock: parseInt(stock),
    claimedBy: [], // List JID user yang sudah klaim
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
