import chalk from "chalk";

const max_time_simulate = 4000;
const min_time_simulate = 2500;

/**
 * Simulasi mengetik natural berdasarkan panjang teks
 */
export async function simulateTyping(sock, remoteJid, text = '') {
  try {
    await sock.sendPresenceUpdate('composing', remoteJid);

    const textLength = typeof text === 'string' ? text.length : 10;
    const baseDelay = Math.min(Math.max(textLength * 30, min_time_simulate), max_time_simulate);
    const randomVariation = Math.floor(Math.random() * 500); 
    const totalDelay = baseDelay + randomVariation;

    await new Promise((resolve) => setTimeout(resolve, totalDelay));
    await sock.sendPresenceUpdate('paused', remoteJid);
  } catch (e) {
    // Abaikan jika gagal update presence
  }
}

/**
 * Wrapper pengiriman pesan yang otomatis memunculkan status mengetik
 */
export async function sendWithTyping(sock, remoteJid, content, options = {}) {
  let textForTyping = '';
  if (typeof content === 'string') {
    textForTyping = content;
  } else if (content && typeof content === 'object') {
    textForTyping = content.text || content.caption || '';
  }

  // Panggil simulasi mengetik otomatis
  await simulateTyping(sock, remoteJid, textForTyping);

  // Kirim pesan aslinya
  return await sock.sendMessage(remoteJid, content, options);
}
