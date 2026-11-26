import fs from "fs";
import { convertToJid } from "../../lib/utils.js";
const dbPath = "./database/guarantee.json";

// Inisialisasi DB jika file belum ada
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
}

async function handle(sock, messageInfo) {
  const { remoteJid, message, content, prefix, command, senderType } = messageInfo;

  // --- Validasi Input ---
  // Format: .addgaransi @tag NamaProduk Durasi(Hari)
  // Contoh: .addgaransi @user Panel-2GB 30
  if (!content?.trim()) {
    const tex = `_⚠️ Format: *${prefix + command} @tag Produk Durasi*_\n\n` +
                `_💬 Contoh: *${prefix + command} @tag Panel-2GB 30*_`;
    return sock.sendMessage(remoteJid, { text: tex }, { quoted: message });
  }

  const args = content.split(" ").filter(s => s.trim() !== "");
  if (args.length < 3) {
    return sock.sendMessage(remoteJid, { text: `⚠️ Format salah! Gunakan: *${prefix + command} @tag Produk Durasi*` }, { quoted: message });
  }

  const rawNumber = args[0];
  const duration = parseInt(args[args.length - 1]); // Ambil angka paling belakang
  const product = args.slice(1, -1).join(" "); // Ambil kata-kata di tengah sebagai nama produk

  if (isNaN(duration)) {
    return sock.sendMessage(remoteJid, { text: "⚠️ Durasi harus berupa angka (hari)!" }, { quoted: message });
  }

  try {
    // Ambil JID pakai helper kamu
    const targetJid = await convertToJid(sock, rawNumber);
    
    // Generate ID Garansi
    const date = new Date();
    const idGaransi = `GRN-${date.getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
    const expired = Date.now() + (duration * 24 * 60 * 60 * 1000);

    // Update Database
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    db.push({
      id: idGaransi,
      user: targetJid,
      product: product,
      issuedAt: Date.now(),
      expired: expired,
      status: "ACTIVE"
    });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    // Kirim Konfirmasi
    const caption = `✅ *GARANSI BERHASIL DITERBITKAN*

◧ ID: *${idGaransi}*
◧ Produk: *${product}*
◧ Target: @${targetJid.split("@")[0]}
◧ Durasi: *${duration} Hari*
◧ Expired: *${new Date(expired).toLocaleDateString('id-ID')}*

_Simpan ID di atas untuk klaim perbaikan._`;

    await sock.sendMessage(remoteJid, { 
      text: caption, 
      mentions: [targetJid] 
    }, { quoted: message });

  } catch (err) {
    console.error("Error addgaransi:", err);
    await sock.sendMessage(remoteJid, { text: "❌ Terjadi kesalahan. Pastikan user pernah chat bot." });
  }
}

export default {
  handle,
  Commands: ["addgaransi", "terbitgaransi"],
  OnlyPremium: false,
  OnlyOwner: true,
};
