import { downloadQuotedMedia, downloadMedia, reply } from '../../lib/utils.js';
import fs from 'fs';
import path from 'path';
import mess from '../../strings.js';
import axios from 'axios';
import config from '../../config.js';

// Load helper uploader dengan proteksi jika file/fungsi tidak ditemukan
let uploadImageFile, logShort, formatApiResponse, formatNetworkError;
try {
  const uploader = await import('../../lib/uploader.js');
  uploadImageFile = uploader.uploadImageFile;
  logShort = uploader.logShort;
  formatApiResponse = uploader.formatApiResponse;
  formatNetworkError = uploader.formatNetworkError;
} catch (e) {
  console.error('\n❌ [DEBUG HD] GAGAL IMPORT ../../lib/uploader.js:', e.message);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const REMINI_URL = 'https://api.autoresbot.com/api/tools/remini';

const http = axios.create({
  timeout: 30000,
  validateStatus: () => true,
});

const isApikeyProblem = (res) => {
  const errCode = String(res?.data?.error_code || '');
  const msg = String(res?.data?.message || '');
  return (
    res?.status === 401 ||
    res?.status === 403 ||
    /key/i.test(errCode) ||
    /apikey/i.test(msg)
  );
};

async function handle(sock, messageInfo) {
  // Safe extraction biar gak TypeError kalau properti messageInfo kurang
  const { m, remoteJid, message, prefix = '.', command = 'hd', type, isQuoted } = messageInfo || {};
  let mediaPath = '';

  console.log('\n=================== [DEBUG HD START] ===================');

  try {
    // ----------------------------------------------------
    // STAGE 1: CHECK MEDIA TYPE
    // ----------------------------------------------------
    console.log('[DEBUG HD] Stage 1: Checking Media Type');
    const mediaType = isQuoted ? isQuoted.type : type;
    console.log('[DEBUG HD] - isQuoted:', Boolean(isQuoted));
    console.log('[DEBUG HD] - detected mediaType:', mediaType);

    if (mediaType !== 'image') {
      return await reply(m, `⚠️ _Kirim/Balas gambar dengan caption *${prefix + command}*_`);
    }

    await sock.sendMessage(remoteJid, {
      react: { text: '⏰', key: message.key },
    });

    // ----------------------------------------------------
    // STAGE 2: DOWNLOAD MEDIA
    // ----------------------------------------------------
    console.log('[DEBUG HD] Stage 2: Downloading Media from WA');
    let media;
    try {
      media = isQuoted ? await downloadQuotedMedia(message) : await downloadMedia(message);
      console.log('[DEBUG HD] - Media downloaded file name:', media);
    } catch (err) {
      console.error('[DEBUG HD] - Download WA Error Object:', err);
      // PENCEGAHAN TypeError .includes()
      const errMsg = err && typeof err.message === 'string' ? err.message : '';
      if (err?.code === 'ECONNRESET' || errMsg.includes('terminated')) {
        return await reply(
          m,
          '❌ Gagal mengunduh gambar dari WhatsApp.\n\nSilakan kirim ulang gambar dan coba lagi.'
        );
      }
      throw err;
    }

    mediaPath = path.join('tmp', media || '');
    console.log('[DEBUG HD] - Target local path:', mediaPath);

    if (!fs.existsSync(mediaPath)) {
      console.error('[DEBUG HD] - File not found in path!');
      return await reply(m, '❌ File gambar tidak ditemukan.\nSilakan kirim ulang gambar.');
    }

    // ----------------------------------------------------
    // STAGE 3: UPLOAD MEDIA
    // ----------------------------------------------------
    console.log('[DEBUG HD] Stage 3: Uploading File');
    let imageUrl;

    if (typeof uploadImageFile !== 'function') {
      throw new Error('Fungsi uploadImageFile dari uploader.js tidak tersedia/gagal di-import!');
    }

    try {
      imageUrl = await uploadImageFile(mediaPath, { convert: true, label: 'HD' });
      console.log('[DEBUG HD] - Uploaded Image URL:', imageUrl);
    } catch (err) {
      console.error('[DEBUG HD] - Upload Error Object:', err);
      const detail = err?.serverMessage || err?.message || String(err);
      return await reply(m, `❌ Gagal mengupload gambar.\n\n*Detail:* ${detail}`);
    }

    // ----------------------------------------------------
    // STAGE 4: CREATE REMINI JOB
    // ----------------------------------------------------
    console.log('[DEBUG HD] Stage 4: Creating Job in Remini API');
    let createRes;
    try {
      createRes = await http.get(REMINI_URL, {
        params: { url: imageUrl },
        headers: {
          Authorization: `Bearer ${config.APIKEY_HD}`,
        },
      });
      console.log('[DEBUG HD] - Create Job Status:', createRes.status);
      console.log('[DEBUG HD] - Create Job Response Body:', createRes.data);
    } catch (err) {
      console.error('[DEBUG HD] - Create Job Network Error:', err);
      const detail = typeof formatNetworkError === 'function' ? formatNetworkError(err, 'API HD') : err?.message;
      return await reply(m, `❌ Gagal memproses gambar.\n\n*Detail:* ${detail}`);
    }

    if (!createRes.data?.job_id) {
      console.error('[DEBUG HD] - No job_id received!');
      const detail = typeof formatApiResponse === 'function' ? formatApiResponse(createRes) : JSON.stringify(createRes.data);
      const hint = isApikeyProblem(createRes) ? '\n\nCek apikey kamu, ketik *.apikey*' : '';
      return await reply(m, `❌ Gagal memproses gambar.\n\n*Respon API:* ${detail}${hint}`);
    }

    const jobId = createRes.data.job_id;
    console.log('[DEBUG HD] - Received Job ID:', jobId);

    // ----------------------------------------------------
    // STAGE 5: POLLING JOB STATUS
    // ----------------------------------------------------
    console.log('[DEBUG HD] Stage 5: Polling Job');
    const maxRetry = 10;
    const delayMs = 7000;
    let attempt = 0;
    let finalImageUrl = null;

    while (attempt < maxRetry) {
      attempt++;
      console.log(`[DEBUG HD] - Polling attempt #${attempt}/${maxRetry}`);

      try {
        const pollRes = await http.get(REMINI_URL, {
          params: { job_id: jobId },
          headers: {
            Authorization: `Bearer ${config.APIKEY_HD}`,
          },
        });

        const data = pollRes.data || {};
        console.log(`[DEBUG HD] - Poll Status HTTP: ${pollRes.status}, Job Status: ${data.status}`);

        if (pollRes.status >= 400 && pollRes.status < 500) {
          const detail = typeof formatApiResponse === 'function' ? formatApiResponse(pollRes) : JSON.stringify(data);
          return await reply(m, `❌ Proses HD gagal.\n\n*Respon API:* ${detail}`);
        }

        if (data.status === 'done') {
          finalImageUrl = data.result;
          console.log('[DEBUG HD] - Job Done! Result URL:', finalImageUrl);
          break;
        }

        if (data.status === 'failed') {
          const detail = typeof formatApiResponse === 'function' ? formatApiResponse(pollRes) : JSON.stringify(data);
          return await reply(m, `❌ Proses HD dilaporkan gagal oleh server.\n\n*Detail:* ${detail}`);
        }
      } catch (pollError) {
        console.error(`[DEBUG HD] - Polling error on attempt #${attempt}:`, pollError?.message);
        if (pollError?.code !== 'ECONNRESET') {
          throw pollError;
        }
      }

      await delay(delayMs);
    }

    if (!finalImageUrl) {
      console.error('[DEBUG HD] - Polling Timeout');
      return await reply(m, '❌ Waktu proses terlalu lama (Timeout). Silakan coba lagi nanti.');
    }

    // ----------------------------------------------------
    // STAGE 6: DOWNLOAD RESULT & SEND
    // ----------------------------------------------------
    console.log('[DEBUG HD] Stage 6: Downloading Final Image');
    const imageRes = await http.get(finalImageUrl, {
      responseType: 'arraybuffer',
    });

    if (imageRes.status !== 200) {
      return await reply(m, `❌ Gagal mengambil hasil gambar (HTTP ${imageRes.status}).`);
    }

    console.log('[DEBUG HD] Stage 7: Sending Image to WhatsApp');
    const MediaBuffer = Buffer.from(imageRes.data);

    await sock.sendMessage(
      remoteJid,
      {
        image: MediaBuffer,
        caption: mess?.general?.success || 'Berhasil!',
      },
      { quoted: message }
    );

    console.log('[DEBUG HD] SUCCESS!');

  } catch (error) {
    // STAGE CRITICAL CATCH - DUMP FULL STACK TRACE
    console.error('\n🔥 [DEBUG HD - CRITICAL CATCH TRAPPED ERROR] 🔥');
    console.error('Error Message :', error?.message);
    console.error('Error Stack   :', error?.stack);
    console.error('Full Error Obj:', error);

    await reply(
      m,
      `❌ *[DEBUG EXCEPTION]*\n\n` +
      `*Error:* ${error?.message || 'Unknown Error'}\n\n` +
      `*Check terminal log for full stack trace.*`
    );
  } finally {
    // Clean temp file
    if (mediaPath && fs.existsSync(mediaPath)) {
      try {
        fs.unlinkSync(mediaPath);
        console.log('[DEBUG HD] Cleaned up temp file:', mediaPath);
      } catch (e) {}
    }
    console.log('=================== [DEBUG HD END] ===================\n');
  }
}

// Bikin export ganda (lowercase & uppercase) biar kompatibel sama loader bot tipe apa pun
export default {
  handle,
  commands: ['hd', 'remini'],
  Commands: ['hd', 'remini'],
  onlyPremium: false,
  OnlyPremium: false,
  onlyOwner: true,
  OnlyOwner: true,
  limitDeduction: 1,
};
