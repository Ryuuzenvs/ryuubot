import { downloadQuotedMedia, downloadMedia, reply } from '../../lib/utils.js';
import fs from 'fs';
import path from 'path';
import mess from '../../strings.js';
import axios from 'axios';
import config from '../../config.js';

const DEBUG = false;

const http = axios.create({
  timeout: 180000,
  validateStatus: () => true,
});
async function debugReply(m, text) {
  if (DEBUG) {
    return await reply(m, text);
  }
}

async function handle(sock, messageInfo) {
  // Ambil semua variabel instansiasi awal
  const { m, remoteJid, message, prefix, command, type, isQuoted } = messageInfo;
  let mediaPath = '';
  
  // Variabel penampung status untuk kebutuhan debug akhir jika lolos ke catch global
  let debugState = {
    step: 'Inisialisasi',
    mediaType: null,
    downloadedMediaName: null,
    localFileExists: false,
    uguuUrlResult: null,
    apiHDFaaResult: null
  };

  try {
    const mediaType = isQuoted ? isQuoted.type : type;
    debugState.mediaType = mediaType;

    if (mediaType !== 'image') {
      return await reply(m, `⚠️ _Kirim/Balas gambar dengan caption *${prefix + command}*_`);
    }

    await sock.sendMessage(remoteJid, {
      react: { text: '⏰', key: message.key },
    });

    // ===============================
    // DEBUG 1: DOWNLOAD MEDIA WA
    // ===============================
    debugState.step = 'Download Media WA';
    let media;
    try {
      media = isQuoted ? await downloadQuotedMedia(message) : await downloadMedia(message);
      debugState.downloadedMediaName = media;
    } catch (err) {
      // JIKA GAGAL DI SINI, KIRIM DUMP VARIABEL NYATA KE USER
      const dumpWA = {
        error_msg: err.message,
        error_stack: err.stack,
        messageInfo_type: type,
        isQuoted_object: isQuoted ? { type: isQuoted.type, mimetype: isQuoted.mimetype } : 'Bukan Quoted',
        raw_message_keys: Object.keys(message || {}),
        raw_message_content: message // Mengintip isi object message Baileys
      };
      
      return await reply(
        m,
        `❌ *[DEBUG STAGE: DOWNLOAD WA]*\n\n` +
        `*Error:* ${dumpWA.error_msg}\n\n` +
        `*Dump Variables:* \n\`\`\`json\n${JSON.stringify(dumpWA, null, 2)}\n\`\`\``
      );
    }

    mediaPath = path.join('tmp', media);
    debugState.localFileExists = fs.existsSync(mediaPath);

    if (!fs.existsSync(mediaPath)) {
      return await reply(
        m, 
        `❌ *[DEBUG STAGE: LOCAL CHECK]*\n\n` +
        `File tidak ada di folder tmp.\n` +
        `*Path dicari:* ${mediaPath}\n` +
        `*Nama Media:* ${media}`
      );
    }

    // ===============================
    // DEBUG 2: UPLOAD TO UGUU
    // ===============================
    debugState.step = 'Upload Uguu';
    const fileBuffer = fs.readFileSync(mediaPath);
    const boundary = `----WebKitFormBoundary${Math.random().toString(16).substring(2)}`;
    
    const postData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="files[]"; filename="image.jpg"\r\n`),
      Buffer.from(`Content-Type: image/jpeg\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    let uploadRes;
    try {
      uploadRes = await axios.post('https://uguu.se/upload.php', postData, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': postData.length
        }
      });
    } catch (upErr) {
      return await reply(
        m,
        `❌ *[DEBUG STAGE: UPLOAD UGUU]*\n\n` +
        `*Error:* ${upErr.message}\n` +
        `*Response Axios:* ${JSON.stringify(upErr.response?.data || {})}`
      );
    }

    const imageUrl = uploadRes.data?.files?.[0]?.url;
    debugState.uguuUrlResult = imageUrl;

    if (!imageUrl) {
      return await reply(
        m,
        `❌ *[DEBUG STAGE: UGUU PARSING]*\n\n` +
        `Uguu tidak merespon URL.\n` +
        `*Raw Response Data:* \n\`\`\`json\n${JSON.stringify(uploadRes.data, null, 2)}\n\`\`\``
      );
    }

    // ===============================
// DEBUG 3: HIT API HD
// ===============================
debugState.step = 'Hit API HD';

let res;

try {
  res = await http.get(
    `https://api-faa.my.id/faa/superhd?url=${encodeURIComponent(imageUrl)}`,
    {
      responseType: 'arraybuffer',
      timeout: 180000
    }
  );
} catch (err) {
  return await reply(
    m,
    `❌ *[DEBUG STAGE: HIT API HD]*\n\n` +
    `Error: ${err.message}`
  );
}

if (res.status !== 200) {
  return await reply(
    m,
    `❌ *[DEBUG STAGE: API STATUS]*\n\n` +
    `Status: ${res.status}`
  );
}

if (DEBUG) {
  await debugReply(
    m,
    `✅ *[DEBUG API HD]*\n\n` +
    `Status: ${res.status}\n` +
    `Content-Type: ${res.headers['content-type'] || 'unknown'}`
  );
}

const mediaBuffer = Buffer.from(res.data);

await sock.sendMessage(
  remoteJid,
  {
    image: mediaBuffer,
    caption: mess.general.success,
  },
  { quoted: message }
);

await sock.sendMessage(remoteJid, {
  react: {
    text: '✅',
    key: message.key,
  },
});

return;

    // Reaksi sukses
    await sock.sendMessage(remoteJid, {
      react: { text: '✅', key: message.key },
    });

  } catch (error) {
    // Menangkap error tak terduga di luar try-catch spesifik
    console.error(error);
    await reply(
      m, 
      `❌ *[CRITICAL GLOBAL ERROR]*\n\n` +
      `*Gagal di Step:* ${debugState.step}\n` +
      `*Message:* ${error.message}\n\n` +
      `*Dump State Saat Crash:* \n\`\`\`json\n${JSON.stringify(debugState, null, 2)}\n\`\`\`\n\n` +
      `*Stack Trace:* \n\`\`\`text\n${error.stack}\n\`\`\``
    );
  } finally {
    if (mediaPath && fs.existsSync(mediaPath)) {
      fs.unlinkSync(mediaPath);
    }
  }
}

export default {
  handle,
  Commands: ['hd', 'remini'],
  OnlyPremium: true,
  OnlyOwner: false,
  limitDeduction: 1,
};
