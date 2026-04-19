import { sendMessageWithMention } from "../lib/utils.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, senderType } = messageInfo;

  const benefitText = `
*─── [ 🌟 BENEFIT LAYANAN BOT ] ───*

📌 *PBC REGULER (Private Bot Chat)*
- Dibuatkan grup khusus (Private Room) antara kamu & bot.
- *Bebas Rate Limit Grup:* Tidak terganggu antrean spam user lain.
- Akses fitur standar bot secara personal.

📌 *PREMUSER (Premium User)*
- Akses semua fitur berlabel *OnlyPremium*.
- *Unlimited Limit:* Gunakan bot sepuasnya tanpa takut kehabisan limit.
- _Note: Tidak termasuk akses Private Room._

📌 *PBC PREMIUM (Private Bot Premium)*
- Mendapatkan semua benefit *PBC Reguler*.
- Mendapatkan status *Premuser* (Unlimited Limit & Premium Features).
- Paket lengkap untuk penggunaan pribadi yang maksimal.

📌 *SEWA GROUP (Reguler vs Premium)*
• *SEWA REGULER:* Bot aktif di grup, semua user menggunakan limit masing-masing. Tidak ada free premium.
• *SEWA PREMIUM:* - Bot aktif di grup.
  - *Free Premium untuk 5 Akun* (Bebas pilih anggota).
  - Tambah slot premium: *+Rp 2.000/akun*.

📌 *JADI BOT & OWNER*
- Hak penuh mengatur bot di luar aturan standar (selama masa aktif).
- Bebas menjual ulang layanan atau membagikan akses ke orang lain.
- Kendali fitur lebih luas dibandingkan user biasa.

*─── [ CATATAN ] ───*
- Patuhi *.rules* yang berlaku agar benefit tidak hangus.
- Konsultasi lebih lanjut? Ketik *.owner*

_Hai @${sender.split("@")[0]}, pilih paket yang sesuai kebutuhanmu!_
`;

  await sendMessageWithMention(
    sock,
    remoteJid,
    benefitText.trim(),
    message,
    senderType
  );
}

export default {
  handle,
  Commands: ["benefit", "keuntungan"],
  OnlyPremium: false,
  OnlyOwner: false,
};
