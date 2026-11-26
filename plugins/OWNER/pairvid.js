import { reply } from "../../lib/utils.js";
import fs from "fs";
import path from "path";

async function handle(sock, messageInfo) {
    const { m, remoteJid, content } = messageInfo;
    
    // Ganti nama file di sini jika formatnya adalah .mp4 (misal: qris1.mp4)
    const filePath = path.resolve("./assets/pair.mp4"); 

    try {
        if (!fs.existsSync(filePath)) {
            return await reply(m, "Error: File tidak ditemukan di folder assets.");
        }

        const nominal = content ? content.replace(/[^0-9]/g, "") : "";
        const nominalText = nominal 
            ? `Nominal: Rp ${parseInt(nominal).toLocaleString("id-ID")}\n` 
            : "";

        const fileBuffer = fs.readFileSync(filePath);
        const isVideo = filePath.endsWith(".mp4");

        // Tampung payload pesan utama
        const messagePayload = {
            caption: ``,
        };

        // Kondisional: jika file berupa mp4, kirim sebagai video. Jika tidak, kirim sebagai image.
        if (isVideo) {
            messagePayload.video = fileBuffer;
            // gifPlayback: true // Tambahkan ini jika ingin video berputar otomatis seperti GIF
        } else {
            messagePayload.image = fileBuffer;
        }

        await sock.sendMessage(remoteJid, messagePayload, { quoted: m });

    } catch (error) {
        console.error("ERROR QRIS:", error);
        await reply(m, `Error: Gagal mengirim file. ${error.message}`);
    }
}

export default {
    handle,
    Commands: ["pairvid"],
    OnlyPremium: false,
    OnlyOwner: true,
    limitDeduction: 0,
};
