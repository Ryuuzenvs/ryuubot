import { findUser, updateUser } from "../../lib/users.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, content, prefix, command } = messageInfo;

  // 1. Validasi Input (Jumlah money)
  if (!content?.trim()) {
    return sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Format salah. Contoh: *${prefix + command} 5000*_` },
      { quoted: message }
    );
  }

  const moneyToAdd = parseInt(content.trim(), 10);
  if (isNaN(moneyToAdd) || moneyToAdd <= 0) {
    return sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Jumlah money harus berupa angka positif._` },
      { quoted: message }
    );
  }

  // 2. Ambil data diri sendiri (sender)
  // Di promoteme.js, 'sender' adalah JID pengirim (owner)
  const dataUsers = await findUser(sender);
  
  if (!dataUsers) {
    return sock.sendMessage(
      remoteJid,
      { text: `⚠️ _Data kamu tidak ditemukan di database. Silakan chat/daftar dulu._` },
      { quoted: message }
    );
  }

  const [docId, userData] = dataUsers;

  // 3. Update Money
  try {
    await updateUser(sender, {
      money: (userData.money || 0) + moneyToAdd,
    });

    // 4. Konfirmasi
    await sock.sendMessage(
      remoteJid,
      { text: `✅ _Berhasil menambah *${moneyToAdd}* money ke akun kamu sendiri._\n_Total money sekarang: *${(userData.money || 0) + moneyToAdd}*_` },
      { quoted: message }
    );
  } catch (error) {
    console.error("Error in addmoneyme:", error);
    await sock.sendMessage(remoteJid, { text: "❌ _Gagal mengupdate database._" }, { quoted: message });
  }
}

export default {
  handle,
  Commands: ["addmoneyme", "amm"], // Bisa pakai shortcut .amm
  OnlyPremium: false,
  OnlyOwner: true, // Wajib owner karena ini fitur 'cheat'
};
