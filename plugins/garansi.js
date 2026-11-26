import fs from "fs";
const dbPath = "./database/guarantee.json";

// Fungsi Helper untuk baca/tulis DB
const readDB = () => JSON.parse(fs.readFileSync(dbPath, "utf-8"));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, content, command } = messageInfo;
  const isOwner = messageInfo.isOwner; // Sesuaikan dengan variabel owner di base kamu

  // 1. COMMAND: .addgaransi (Khusus Owner)
  // Format: .addgaransi 628xxx|Product Name|30 (dalam hari)
  if (command === "addgaransi") {
    if (!isOwner) return sock.sendMessage(remoteJid, { text: "❌ Fitur ini khusus Owner!" }, { quoted: message });
    
    const parts = content.split("|");
    if (parts.length < 3) return sock.sendMessage(remoteJid, { text: "Format salah! Contoh: *.addgaransi 628123|Panel 2GB|30*" }, { quoted: message });

    const target = parts[0].trim() + "@s.whatsapp.net";
    const product = parts[1].trim();
    const duration = parseInt(parts[2].trim());
    const idGaransi = "GRN-" + Math.floor(Math.random() * 1000000);
    const expired = Date.now() + (duration * 24 * 60 * 60 * 1000);

    let db = readDB();
    db.push({ id: idGaransi, user: target, product, expired, status: "ACTIVE" });
    writeDB(db);

    return sock.sendMessage(remoteJid, { 
      text: `✅ *BERHASIL TERBITKAN GARANSI*\n\nID: ${idGaransi}\nUser: @${target.split("@")[0]}\nProduk: ${product}\nDurasi: ${duration} Hari`,
      mentions: [target]
    }, { quoted: message });
  }

  // 2. COMMAND: .cekgaransi (Untuk User)
  if (command === "cekgaransi" || command === "mygaransi") {
    let db = readDB();
    const userGaransi = db.filter(g => g.user === sender);

    if (userGaransi.length === 0) {
      return sock.sendMessage(remoteJid, { text: "❌ Kamu tidak memiliki kartu garansi aktif." }, { quoted: message });
    }

    let list = "💳 *E-GUARANTEE CARD DIGITAL*\n\n";
    userGaransi.forEach((g, i) => {
      const remaining = Math.ceil((g.expired - Date.now()) / (1000 * 60 * 60 * 24));
      const status = remaining > 0 ? "✅ ACTIVE" : "❌ EXPIRED";
      list += `${i+1}. *ID:* ${g.id}\n   *Produk:* ${g.product}\n   *Status:* ${status}\n   *Sisa:* ${remaining} Hari\n\n`;
    });
    list += "_Gunakan ID di atas untuk klaim perbaikan ke owner._";

    return sock.sendMessage(remoteJid, { text: list }, { quoted: message });
  }
}

export default {
  handle,
  Commands: ["cekgaransi", "mygaransi"],
  OnlyPremium: false,
  OnlyOwner: false, // Pengecekan owner dilakukan di dalam function handle
};
