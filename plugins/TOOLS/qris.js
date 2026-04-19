import { reply } from "../../lib/utils.js";

import fs from "fs";

import path from "path";

async function handle(sock, messageInfo) {

    const { m, remoteJid, content } = messageInfo; // Tambahkan content di sini

    const imagePath = path.resolve("./assets/qris.jpg");

    try {

        if (!fs.existsSync(imagePath)) {

            return await reply(m, "_Error: File qris.jpg tidak ditemukan di folder assets._");

        }

        // Ambil nominal dari input (misal: .qris 2000)

        // Kita bersihkan karakter selain angka agar aman

        const nominal = content ? content.replace(/[^0-9]/g, "") : "";

        

        // Buat teks tambahan jika ada nominal

        const nominalText = nominal 

            ? `\n\n*Nominal:* Rp ${parseInt(nominal).toLocaleString("id-ID")}` 

            : "";

        await sock.sendMessage(remoteJid, {

            image: fs.readFileSync(imagePath),

            caption: `*── 💳 PEMBAYARAN QRIS ──*${nominalText}\n\nSilakan scan kode QR di atas untuk melakukan pembayaran.\n\n_Mohon sertakan bukti transfer setelah melakukan pembayaran._ \n\n*Dengan membeli user atau customer sudah membaca .rules, dan .benefit serta paham atas segala resiko pembelian jika kesalahan ada di sisi pembeli, penjual tidak berkewajiban atas hak pembeli, segala bentuk transaksi tidak dapat di kembalikan.*`,

        }, { quoted: m });

    } catch (error) {

        console.error("ERROR QRIS:", error);

        await reply(m, `_Error: Gagal mengirim QRIS. ${error.message}_`);

    }

}

export default {

    handle,

    Commands: ["qris", "qr", "pay"],

    OnlyPremium: false,

    OnlyOwner: false,

    limitDeduction: 0,

};
