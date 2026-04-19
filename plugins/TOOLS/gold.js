import { reply } from "../../lib/utils.js";
import axios from "axios";

async function handle(sock, messageInfo) {
    const { m, remoteJid } = messageInfo;

    try {
        // Panggil API PHP kita
//http://localhost/gold-tracker/api.php
        const response = await axios.get("http://127.0.0.1/gold-tracker/api.php");
        const data = response.data;
        console.log("DEBUG DATA JSON:", JSON.stringify(data, null, 2));
        const ana = data.analysis;

        // Logic Emoji
        let emoji = "📊";
        if (ana.recommendation.includes("ALL-IN")) emoji = "🚨";
        else if (ana.recommendation.includes("CICIL")) emoji = "🛒";
        else if (ana.recommendation.includes("SELL")) emoji = "💰";

        // Pesan Lengkap
let teks = `*── 🟨 GOLD ANALYSIS REPORT 🟨 ──*\n\n`;
        teks += `📅 *Tanggal:* ${new Date().toLocaleDateString('id-ID')}\n`;
        teks += `💰 *Harga Beli:* Rp ${data.current_price.toLocaleString()}\n`;
        teks += `💸 *Net Jual:* Rp ${data.sell_price.toLocaleString()}\n\n`;
        
        teks += `📍 *Zona:* ${ana.zone}\n`;
        teks += `${emoji} *Action:* ${ana.recommendation}\n\n`;
        
        teks += `⚖️ *RRR:* ${ana.rrr}x | *Status:* ${ana.worth_it ? "✅ WORTH IT" : "⚠️ SKIP"}\n\n`;
        
        teks += `🚀 *NEXT TARGETS:*\n`;
        teks += `• *All-In Area:* Rp ${ana.next_all_in.toLocaleString()}\n`;
        teks += `• *Take Profit:* Rp ${ana.next_tp.toLocaleString()}\n\n`;
        
        teks += `_Bot Auto-Generated Gold Tracker_`;

        await reply(m, teks);
     } catch (error) {
    let msg = "Gagal memanggil API.\n\n";
    if (error.code === 'ECONNREFUSED') msg += "Error: Koneksi ke server web ditolak (ECONNREFUSED).";
    else if (error.code === 'ETIMEDOUT') msg += "Error: Koneksi timeout.";
    else msg += `Error: ${error.message}`;
    
    await reply(m, msg);
    }    
}

export default {
    handle,
    Commands: ["gold", "cekemas"],
    OnlyPremium: false,
    OnlyOwner: false,
    limitDeduction: 1,
};
