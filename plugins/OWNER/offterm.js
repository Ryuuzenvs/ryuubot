import { reply } from "../../lib/utils.js";

async function handle(sock, messageInfo) {
    const { m, remoteJid } = messageInfo;

    try {
        await reply(m, "⚠️ *System Shutdown:* Bot akan dimatikan...");

        // 1. Matikan koneksi Baileys dengan benar
        // Ini memberi sinyal ke server WA bahwa bot akan logout/offline
        if (sock) {
            await sock.end(undefined); // Tutup koneksi dengan graceful
        }

        // 2. Jeda singkat untuk memastikan penutupan selesai
        await new Promise(resolve => setTimeout(resolve, 500));

        // 3. Matikan proses
        process.exit(0);

    } catch (error) {
        console.error("OFFTERM ERROR:", error);
        process.exit(1); // Exit dengan kode 1 jika ada error fatal
    }
}

export default {
    handle,
    Commands: ["offterm", "offterminal", "shutdown"],
    OnlyPremium: false,
    OnlyOwner: true, // WAJIB, jangan sampai orang lain bisa matiin bot kamu
};
