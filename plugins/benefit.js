import { sendMessageWithMention } from "../lib/utils.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, senderType } = messageInfo;

  const benefitText = `
*─── [ 🌟 BENEFIT LAYANAN BOT ] ───*

📌 *SEWA GROUP (Reguler vs Premium)*
• *SEWA REGULER:* Bot aktif di grup, semua user menggunakan limit masing-masing. Tidak ada free premium.
• *SEWA PREMIUM:* Bot aktif di grup.
 - Free Premium untuk 5 Akun(Bebas pilih anggota).
 - Tambah slot premium: *+Rp 2.000/akun*.

📌 *ROLE OWNER (+ fitur jadibot)*
- Numpang nomor admin, kamu cuma dapet akses Owner.
- Hak penuh mengatur bot, kendali fitur luas, bebas jual ulang layanan.
- Jika sewa permanen cukup bayar sekali di awal, *tanpa biaya bulanan*.

📌 *BIKIN BOT / RESELLER ROLE(Owner + Nomor Sendiri Jadi Bot)*
- Nomor kamu sendiri yang di-clone jadi bot + dapet akses Owner full fitur.
- Bisa respons chat otomatis, buat pribadi, atau dimasukkan ke grup lain.
- Jika sewa permanen, perlu bayar server panel *Rp 5.000 / bulan*.

📌 *PAID GC (PREM + GRUP BERBAYAR)*
- Akses penuh masuk ke dalam Group Berbayar (Paid GC).
- Bot standby dan aktif merespon di dalam grup selama 24/7 tanpa henti.
- Sudah otomatis mendapatkan status Premium (Free Premium)

📌 *PREMIUM USER*
- Limit otomatis berubah menjadi Unlimited.
- Membuka semua akses fitur premium yang terkunci untuk user biasa.

📌 *ONLY RVO*
- Nomor WhatsApp kamu sendiri di-clone / dijadikan bot.
- Sistem bot khusus yang hanya bisa digunakan untuk menggunakan fitur RVO (Read View Once).

📌 *CUSTOM FITUR*
- Request tambah atau modifikasi fitur khusus sesuai dengan kebutuhanmu.
- Sistem pengerjaan langsung disesuaikan dengan script bot yang digunakan.
- Harga menyesuaikan dengan tingkat kesulitan fitur yang diminta.

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

