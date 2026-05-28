import axios from "axios";
import config from "../../config.js";
import { getProfilePictureUrl } from "../../lib/cache.js";
import { sendImageAsSticker } from "../../lib/exif.js";

// Daftar palet warna dari kode Ourin
const COLORS = {
  pink: '#f68ac9', blue: '#6cace4', red: '#f44336', green: '#4caf50',
  yellow: '#ffeb3b', purple: '#9c27b0', darkblue: '#0d47a1', lightblue: '#03a9f4',
  ash: '#9e9e9e', orange: '#ff9800', black: '#000000', white: '#ffffff',
  teal: '#008080', lightpink: '#FFC0CB', chocolate: '#A52A2A', salmon: '#FFA07A',
  magenta: '#FF00FF', tan: '#D2B48C', wheat: '#F5DEB3', deeppink: '#FF1493',
  fire: '#B22222', skyblue: '#00BFFF', brightskyblue: '#1E90FF', hotpink: '#FF69B4',
  lightskyblue: '#87CEEB', seagreen: '#20B2AA', darkred: '#8B0000', orangered: '#FF4500',
  cyan: '#48D1CC', violet: '#BA55D3', mossgreen: '#00FF7F', darkgreen: '#008000',
  navyblue: '#191970', darkorange: '#FF8C00', darkpurple: '#9400D3', fuchsia: '#FF00FF',
  darkmagenta: '#8B008B', darkgray: '#2F4F4F', peachpuff: '#FFDAB9', darkishgreen: '#BDB76B',
  darkishred: '#DC143C', goldenrod: '#DAA520', darkishgray: '#696969', darkishpurple: '#483D8B',
  gold: '#FFD700', silver: '#C0C0C0'
};

const DEFAULT_PP = 'https://files.catbox.moe/nwvkbt.png';

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, content, isQuoted, prefix, command, pushName } = messageInfo;

  try {
    // Parsing argument teks (Pisahkan kata pertama sebagai warna)
    const args = content ? content.trim().split(/ +/) : [];
    
    // Jika input kosong atau argumen kurang, kirim petunjuk penggunaan & daftar warna
    if (args.length === 0 || (args.length === 1 && !isQuoted?.text)) {
      const colorList = Object.keys(COLORS).join(', ');
      await sock.sendMessage(remoteJid, {
        text: `💬 *ǫᴜᴏᴛᴇ sᴛɪᴄᴋᴇʀ*\n\n` +
              `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
              `┃ ◦ \`${prefix + command} <warna> <text>\`\n` +
              `┃ ◦ Reply pesan + \`${prefix + command} <warna>\`\n` +
              `╰┈┈⬡\n\n` +
              `> Contoh: \`${prefix + command} pink Hai semuanya!\`\n\n` +
              `╭┈┈⬡「 🎨 *ᴡᴀʀɴᴀ* 」\n` +
              `┃ ${colorList}\n` +
              `╰┈┈⬡`
      }, { quoted: message });
      return;
    }

    // Tentukan warna latar belakang
    const colorInput = args[0].toLowerCase();
    let backgroundColor = COLORS[colorInput];
    let quoteText = "";

    if (backgroundColor) {
      // Jika kata pertama adalah warna valid, ambil sisa katanya sebagai teks qc
      quoteText = args.slice(1).join(' ');
    } else {
      // Jika kata pertama BUKAN warna, jadikan hitam default, dan seluruh argumen adalah teks qc
      backgroundColor = COLORS.black;
      quoteText = args.join(' ');
    }

    // Jika teks qc kosong tapi user melakukan reply (quoted chat), ambil teks dari chat yang di-reply
    if (!quoteText.trim() && isQuoted?.text) {
      quoteText = isQuoted.text;
    }

    // Proteksi jika teks masih kosong total
    if (!quoteText || quoteText.trim() === "") {
      return await sock.sendMessage(remoteJid, { text: `❌ *ᴇʀʀᴏʀ*\n\n> Masukkan teks untuk dijadikan quote sticker!` }, { quoted: message });
    }

    // Batasi panjang teks agar layout stiker tidak hancur dan gepeng
    if (quoteText.length > 100) {
      return await sock.sendMessage(remoteJid, { text: `❌ *ᴇʀʀᴏʀ*\n\n> Teks terlalu panjang! Maksimal 100 karakter.` }, { quoted: message });
    }

    // Kirim reaksi loading
    await sock.sendMessage(remoteJid, { react: { text: "⏰", key: message.key } });

    // Ambil foto profil user dari cache/system
    let ppUser;
    try {
      ppUser = await getProfilePictureUrl(sock, sender);
    } catch {
      ppUser = DEFAULT_PP;
    }

    // Susun objek JSON payload untuk dikirim ke API Brat Siputzx
    const jsonPayload = {
      messages: [
        {
          from: {
            id: Math.floor(Math.random() * 10000),
            first_name: pushName || "User",
            last_name: "",
            name: "",
            photo: { url: ppUser || DEFAULT_PP }
          },
          text: quoteText,
          entities: [],
          avatar: true,
          media: { url: "" },
          mediaType: "",
          replyMessage: { name: "", text: "", entities: [], chatId: 0 }
        }
      ],
      backgroundColor: backgroundColor,
      width: 512,
      height: 512,
      scale: 2,
      type: "quote",
      format: "png",
      emojiStyle: "apple"
    };

    // Tembak API menggunakan axios dengan tipe arraybuffer
    const response = await axios.post('https://brat.siputzx.my.id/quoted', jsonPayload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer'
    });

    const buffer = Buffer.from(response.data, 'binary');

    // Konfigurasi metadata stiker wm
    const options = {
      packname: config.sticker_packname || "QC Sticker",
      author: config.sticker_author || "Bot-Engine",
    };

    // Konversi buffer PNG menjadi stiker webp dan kirimkan ke user
    await sendImageAsSticker(sock, remoteJid, buffer, options, message);

    // Kirim reaksi sukses
    await sock.sendMessage(remoteJid, { react: { text: "✅", key: message.key } });

  } catch (error) {
    console.error("Error pada plugin QC:", error);
    
    await sock.sendMessage(remoteJid, { react: { text: "❌", key: message.key } });

    const errorMessage = `⚠️ Maaf, terjadi kesalahan saat memproses stiker quote Anda.\n\n*Error:* ${error.message}`;
    await sock.sendMessage(remoteJid, { text: errorMessage }, { quoted: message });
  }
}

export default {
  handle,
  Commands: ["qc", "quotesticker"],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 1, // Hemat limit karena gratis!
};
