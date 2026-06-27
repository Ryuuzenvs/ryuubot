import { sendMessageWithMention } from "../lib/utils.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, senderType } = messageInfo;

  const benefitText = `
╭━━━〔 TIMELINE PEMANASAN NOMOR WA 〕━━━╮
              (ANTI-SUSPEND)
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

⚠️ ATURAN UTAMA

Selama proses pemanasan Hari 1 sampai Hari 7, jangan lakukan pair device ke WA Web, Desktop, atau tools otomatisasi apa pun.

Nomor harus tetap berada di satu HP fisik terlebih dahulu.


━━━━━━━〔 HARI 1 〕━━━━━━━
Setup dan Inisiasi Pasif

✓ Lengkapi profil:
• Foto asli
• Deskripsi bio
• Nama akun jelas

✓ Simpan minimal 5-10 nomor kontak tim/teman

✓ Kirim chat manual berupa sapaan ringan

✓ Buat 1 status WA


━━━━━━━〔 HARI 2 - 3 〕━━━━━━━
Membangun Interaksi Organik

✓ Obrolan dua arah
✓ Kirim gambar / VN
✓ Panggilan suara 1-2 menit
✓ Masuk 1-2 grup aktif
✓ Update status 1x sehari


━━━━━━━〔 HARI 4 - 5 〕━━━━━━━
Uji Coba Terbatas

✓ Chat nomor baru:
3-5 nomor per hari

⚠️ Jika pending/lambat:
Stop aktivitas + diamkan 12 jam


━━━━━━━〔 HARI 6 - 7 〕━━━━━━━
Fase Transisi

✓ Chat nomor baru:
10-15 nomor per hari

✓ Pertahankan:
Status + call + media


━━━━━━━〔 HARI 8 〕━━━━━━━
Menghubungkan ke Bot

✓ IP server stabil

✓ Random delay:
30-60 detik/pesan

✓ Limit awal:
30-50 pesan/hari


━━━━━━━〔 PERBANDINGAN 〕━━━━━━━

WA ORIGINAL
→ Sensitivitas tinggi
→ Broadcast lebih rawan

WA BUSINESS
→ Toleransi sedikit lebih longgar
→ Broadcast lebih aman jika kontak tersimpan

_Hai @${sender.split("@")[0]}, berikut guide nya!_
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
  Commands: ["guide", "guideantisuswa", "guidewa"],
  OnlyPremium: false,
  OnlyOwner: false,
};

