import config from "../config.js";

async function handle(sock, messageInfo) {
  let { remoteJid, message, content, sender, prefix, command } = messageInfo;

  // --- VALIDASI COMMAND ---
  // Jika handler bot utama belum menyaring command secara otomatis, filter di sini
  if (command !== 'confess') return;

  // --- SANITISASI PENGIRIM (ANTI-LID & MULTI-DEVICE) ---
  let senderJid = sender;
  if (senderJid.includes(':')) {
    senderJid = senderJid.split(':')[0] + '@s.whatsapp.net';
  }

  // --- VALIDASI INPUT ---
  if (!content || content.trim() === "") {
    return await sendHelpMessage(sock, remoteJid, prefix, message);
  }

  const parts = content.split("|");
  if (parts.length < 3) {
    return await sendHelpMessage(sock, remoteJid, prefix, message);
  }

  let [targetInput, fakeName, ...messageParts] = parts;
  const secretMessage = messageParts.join("|").trim();
  fakeName = fakeName.trim();
  targetInput = targetInput.trim();

  // --- SANITISASI NOMOR HP TARGET ---
  let cleanNumber = targetInput.replace(/\D/g, '');

  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.slice(1);
  } else if (cleanNumber.startsWith('8')) {
    cleanNumber = '62' + cleanNumber;
  }

  // Target wajib menggunakan s.whatsapp.net
  const targetJid = `${cleanNumber}@s.whatsapp.net`;

  console.log(`[DEBUG] Confess request dari ${senderJid} ke target: ${targetJid}`);

  try {
    // --- 1. KIRIM KE TARGET ---
    let targetMessage = `━━━━ 💌 *CONFESS MESSAGE* 💌 ━━━━\n\n`;
    targetMessage += `Hai! Kamu menerima sebuah pesan rahasia. 🤫\n\n`;
    targetMessage += `👤 *Dari:* _${fakeName}_\n`;
    targetMessage += `📝 *Pesan:* \n`;
    targetMessage += `> "${secretMessage}"\n\n`;
    targetMessage += `━━━━━━━ ※ 🔔 ※ ━━━━━━━\n`;
    targetMessage += `_Balas chat ini tidak akan terhubung ke pengirim asli._`;

    await sock.sendMessage(targetJid, { text: targetMessage });

    // --- 2. KIRIM NOTIFIKASI SUKSES KE PENGIRIM ---
    // Menggunakan remoteJid agar notifikasi sukses terkirim ke tempat perintah itu diketik (bisa di GC / PM)
    let successText = `✅ *Pesan Confess Berhasil Dikirim!*\n\n`;
    successText += `📱 *Target:* +${cleanNumber}\n`;
    successText += `🎭 *Sebagai:* ${fakeName}\n\n`;
    successText += `_Sstt.. Rahasia kamu aman bersama kami!_`;

    await sock.sendMessage(remoteJid, { text: successText }, { quoted: message });

  } catch (err) {
    console.error("[ERROR] Gagal mengirim pesan confess:", err);
    await sock.sendMessage(
      remoteJid, 
      { text: "❌ Gagal mengirim confess. Pastikan nomor target aktif, menggunakan format WhatsApp resmi, dan bot tidak sedang terkena rate limit." }, 
      { quoted: message }
    );
  }
}

// Helper untuk menampilkan format bantuan pesan confess
async function sendHelpMessage(sock, remoteJid, prefix, message) {
  let helpText = `❌ *Format Confess Salah!*\n\n`;
  helpText += `Gunakan format berikut:\n`;
  helpText += `_${prefix || '.'}confess nomor target | nama samaran | isi pesan_\n\n`;
  helpText += `*Contoh:* \n`;
  helpText += `_${prefix || '.'}confess 6281234567890 | Pengagum Rahasia | Kamu keren banget hari ini!_`;
  
  return await sock.sendMessage(remoteJid, { text: helpText }, { quoted: message });
}

export default {
  handle,
  Commands: ["confess"],
  OnlyPremium: false,
  OnlyOwner: false, // Set false agar bisa digunakan oleh user biasa di GC maupun PM
};
