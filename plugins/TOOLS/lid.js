import util from "util"; // Import modul bawaan NodeJS untuk inspeksi objek

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, m } = messageInfo;

  try {
    // Gunakan util.inspect dengan depth tertentu agar tidak terlalu panjang, tapi detail tetap kelihatan
    const cleanMessage = util.inspect(message, { depth: 2, json: false });
    const cleanM = m ? util.inspect(m, { depth: 2, json: false }) : "m is undefined/null";

    const debugText = `
🔍 *HASIL DEBUG MESSAGE INFO* 🔍

📌 *1. remoteJid (ID Room/Chat):*
${remoteJid}

👤 *2. sender (ID Pengirim):*
${sender}

✉️ *3. message (Struktur Pesan Mentah):*
\`\`\`javascript
${cleanMessage.slice(0, 1500)}... (truncated)
\`\`\`

📱 *4. m (Objek Modifikasi):*
\`\`\`javascript
${cleanM.slice(0, 1500)}... (truncated)
\`\`\`
`.trim();

    await sock.sendMessage(
      remoteJid,
      { text: debugText },
      { quoted: message }
    );
    return;
  } catch (error) {
    console.error("Gagal saat debug:", error);
    await sock.sendMessage(
      remoteJid,
      { text: `Gagal debug: ${error.message}` },
      { quoted: message }
    );
  }
}

export default {
  handle,
  Commands: ["id", "debug"],
  OnlyPremium: false,
  OnlyOwner: true,
};
