// handle/menu.js
import menuProxy, { loadMenuOnce } from '../database/menu.js';
import config from '../config.js';
import { readFileAsBuffer } from '../lib/fileHelper.js';
import { reply, style, getCurrentDate, readMore } from '../lib/utils.js';
import { isOwner, isPremiumUser } from '../lib/users.js';
import fs from 'fs/promises';
import path from 'path';

/* =========================
   CONFIG (MUDAH DIGANTI)
========================= */

const GROUP_LINK = 'https://chat.whatsapp.com/DSugTQSCKY43mU2TBwuzTf';
const ENABLE_MENU_AUDIO = false;

const MENU_MEDIA_TYPE = 'image'; // image / video / gif

const MENU_MEDIA_FILE = '@assets/allmenu.jpg'; // bisa .jpg / .mp4 / .gif

const AUDIO_PATH = path.join(process.cwd(), 'database', 'audio');

const AUDIO_FILES = {
  pagi: 'pagi.opus',
  siang: 'siang.opus',
  sore: 'sore.opus',
  petang: 'petang.opus',
  malam: 'malam.opus',
};

/* =========================
   HELPER
========================= */

function getUserRole(sender) {
  if (isOwner(sender)) return 'Owner';
  if (isPremiumUser(sender)) return 'Premium';
  return 'User';
}

function getGreetingFile() {
  const now = new Date();
  const wibHours = (now.getUTCHours() + 7) % 24;

  if (wibHours >= 5 && wibHours <= 10) return AUDIO_FILES.pagi;
  if (wibHours >= 11 && wibHours < 15) return AUDIO_FILES.siang;
  if (wibHours >= 15 && wibHours <= 18) return AUDIO_FILES.sore;
  if (wibHours > 18 && wibHours <= 19) return AUDIO_FILES.petang;

  return AUDIO_FILES.malam;
}

async function getGreetingAudio() {
  try {
    const file = getGreetingFile();
    return await fs.readFile(path.join(AUDIO_PATH, file));
  } catch (err) {
    console.error('Error reading audio:', err);
    return null;
  }
}

function formatMenu(title, items) {
  const formattedItems = items.map((item) => {
    if (typeof item === 'string') return `┣⌬ ${item}`;

    if (typeof item === 'object' && item.command && item.description) {
      return `┣⌬ ${item.command} ${item.description}`;
    }

    return '┣⌬ [Invalid item]';
  });

  return `┏━『 *${title.toUpperCase()}* 』
┃
${formattedItems.join('\n')}
┗━━━━━━━◧`;
}

function buildMainMenu(menuData) {
  return `
┏━『 *MENU UTAMA* 』
┃
${Object.keys(menuData)
  .map((key) => `┣⌬ .menu ${key}`)
  .join('\n')}
┗━━━━━━━◧

*.owner* UNTUK MENGHUBUNGI OWNER
*.pricelist* UNTUK MELIHAT HARGA PRODUK
*.role* UNTUK MELIHAT DETAIL ROLE
*.rules* UNTUK MELIHAT RULES
*.benefit* UNTUK MELIHAT KEUNTUNGAN
            
_Ketik nama kategori untuk melihat isinya._
_Contoh: *.menu ai* atau *.allmenu* untuk menampilkan semua menu_`;
}

function buildAllMenu(pushName, roleUser, date, menuData) {
  // Mengembalikan data penuh (tidak dipotong) untuk pengetesan kali ini
  return `
╭─────────────
│ Name  : *${pushName || 'Unknown'}*
│ Status : *${roleUser}*
│ Date   : *${date}*
├────
╰──────────────

${readMore()}

${Object.keys(menuData)
  .map((key) => formatMenu(key, menuData[key]))
  .join('\n\n')}`;
}

async function sendMenuAudio(sock, jid, quoted) {
  if (!ENABLE_MENU_AUDIO) return;

  const audio = await getGreetingAudio();
  if (!audio) return;

  await sock.sendMessage(
    jid,
    {
      audio,
      mimetype: 'audio/mp4',
      ptt: true,
    },
    { quoted },
  );
}

/* =========================
   MAIN HANDLER (DEBUG & TROUBLESHOOT MODE)
========================= */

async function handle(sock, messageInfo) {
  const { m, remoteJid, pushName, sender, content, command, message } = messageInfo;

  const roleUser = getUserRole(sender);
  const date = getCurrentDate();
  const category = (content || '').toLowerCase();

  const menuData = await loadMenuOnce();
  let result;

  /* ========= CATEGORY MENU ========= */
  if (category && menuData[category]) {
    const response = formatMenu(category, menuData[category]);
    result = await reply(m, style(response));
    
  } else if (command === 'menu') {
    /* ========= MENU UTAMA ========= */
    const response = buildMainMenu(menuData);
    result = await reply(m, style(response));
    
  } else if (command === 'allmenu') {
    console.log(`\n[DEBUG ALLMENU] Triggered oleh: ${sender} (${pushName})`);
    
    /* ========= ALL MENU ========= */
    const response = buildAllMenu(pushName, roleUser, date, menuData);
    console.log(`[DEBUG ALLMENU] String menu berhasil dibuat. Panjang string: ${response.length} karakter.`);

    let buffer;
    try {
      buffer = await readFileAsBuffer(MENU_MEDIA_FILE);
      console.log(`[DEBUG ALLMENU] File media ditemukan. Ukuran buffer: ${buffer.length} bytes.`);
    } catch (fileError) {
      console.error(`[DEBUG ALLMENU ERROR] Gagal membaca file media di ${MENU_MEDIA_FILE}:`, fileError);
    }

    // TROUBLESHOOT KEDUA: Kita buang total object externalAdReply yang dicurigai memicu filter spam WA
    let mediaMessage = {};

    if (buffer) {
      if (MENU_MEDIA_TYPE === 'video') {
        mediaMessage = {
          video: buffer,
          caption: style(response)
        };
      } else if (MENU_MEDIA_TYPE === 'gif') {
        mediaMessage = {
          video: buffer,
          gifPlayback: true,
          caption: style(response)
        };
      } else {
        // Default: 'image'
        mediaMessage = {
          image: buffer,
          caption: style(response)
        };
      }
      console.log(`[DEBUG ALLMENU] Objek mediaMessage berhasil disusun dengan type: ${MENU_MEDIA_TYPE} (Tanpa adReply).`);
    } else {
      mediaMessage = { text: style(response) };
      console.log(`[DEBUG ALLMENU] Fallback ke text karena buffer kosong.`);
    }

    /* ====== KIRIM ====== */
    try {
      console.log(`[DEBUG ALLMENU] Mencoba mengirim pesan ke ${remoteJid}...`);
      result = await sock.sendMessage(remoteJid, mediaMessage, { quoted: message });
      console.log(`[DEBUG ALLMENU] Status Kirim: BERHASIL. Message Timestamp: ${result?.messageTimestamp || 'N/A'}`);
    } catch (sendError) {
      console.error('[DEBUG ALLMENU ERROR] Catch block terpicu saat sendMessage:', sendError);
      
      console.log(`[DEBUG ALLMENU] Mencoba pengiriman darurat murni TEXT ONLY...`);
      result = await sock.sendMessage(remoteJid, { text: style(response) }, { quoted: message });
      console.log(`[DEBUG ALLMENU] Pengiriman darurat murni text: ${result ? 'BERHASIL' : 'GAGAL'}`);
    }
  }

  /* ========= AUDIO MENU ========= */
  if (command === 'allmenu' || (command === 'menu' && !category)) {
    await sendMenuAudio(sock, remoteJid, result);
  }
}

/* =========================
   EXPORT
========================= */

export default {
  Commands: ['menu', 'allmenu'],
  OnlyPremium: false,
  OnlyOwner: false,
  handle,
};
