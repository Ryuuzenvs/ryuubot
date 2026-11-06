import config from '../config.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { listOwner } from '../lib/users.js';
import { initAutoOrderWorker } from "./autoOrderService.js";
import { initWaasWorker } from "./waasService.js"; 

import makeWASocket, {
  useMultiFileAuthState,
  getContentType,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from 'baileys';

import EventEmitter from 'events';

const eventBus = new EventEmitter();
const store = {
  contacts: {},
};

let reconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT = config.max_reconnect || 5;
const RECONNECT_DELAY = config.reconnect_delay || 5000;

global.statusConnected = global.statusConnected || {};

function setStatusConnected(id, status) {
  global.statusConnected = global.statusConnected || {};
  global.statusConnected[id] = !!status;
}

import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
const logger = pino({ level: 'silent' });

import { updateSocket } from './scheduled.js';
import { sessions } from './cache.js';
import serializeMessage from './serializeMessage.js';
import { updateJadibot, getJadibot } from './jadibot.js';

import { processMessage, participantUpdate } from '../autoresbot.js';

import {
  createBackup,
  getnumberbot,
  logWithTime,
  setupSessionDirectory,
  isQuotedMessage,
  removeSpace,
  restaring,
  success,
  danger,
  sleep,
  sendMessageWithMentionNotQuoted,
  validations,
  extractNumbers,
  deleteFolderRecursive,
  getSenderType,
} from './utils.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let qrCount = 0;
let error403Timestamps = [];

async function getTimeStamp() {
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', hour12: false };
  const timeString = now.toLocaleTimeString('id-ID', options);
  return `[${timeString}]`;
}

async function getLogFileName() {
  const now = new Date();
  const folder = path.join(process.cwd(), 'logs_panel');

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  return path.join(
    folder,
    `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-` +
      `${now.getDate().toString().padStart(2, '0')}______` +
      `${now.getHours().toString().padStart(2, '0')}-` +
      `${now.getMinutes().toString().padStart(2, '0')}.log`,
  );
}

async function debugLog(msg) {
  if (typeof msg !== 'object' || msg === null) {
    console.error('debugLog hanya menerima object.');
    return;
  }

  const logEntry = `${await getTimeStamp()} DEBUGGING\n${JSON.stringify(
    msg,
    null,
    2,
  )}\n----------------- || ------------------\n`;
  const logFile = await getLogFileName();

  try {
    await fs.promises.appendFile(logFile, logEntry);
  } catch (error) {
    console.error(`Gagal menulis log: ${error.message}`);
  }
}

async function connectToWhatsApp(folder = 'session') {
  let phone_number_bot = '';
  const numbersString = extractNumbers(folder);

  const dataSession = await getJadibot(numbersString);
  if (dataSession) {
    phone_number_bot = numbersString;
    if (dataSession.status == 'stop' || dataSession.status == 'logout') {
      return;
    }
  }

  for (const { key, validValues, validate, errorMessage } of validations) {
    const value = config[key]?.toLowerCase();
    if (validValues && !validValues.includes(value)) {
      return danger('Error config.js', errorMessage);
    }
    if (validate && !validate(config[key])) {
      return danger('Error config.js', errorMessage);
    }
  }

  const sessionDir = path.join(process.cwd(), folder);

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: logger,
    printQRInTerminal: false,
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    connectTimeoutMs: 30000,
    defaultQueryTimeoutMs: 30000,
    keepAliveIntervalMs: 20000,
    syncFullHistory: false,
    fireInitQueries: true,
    markOnlineOnConnect: true,
  });

  // Simpan sesi ke dalam Map
  sessions.set(folder, sock);

  // ================= LOGIC PAIRING CODE (IZINKAN SUB-BOT FOLDER SESSION) =================
  if (!sock.authState.creds.registered && config.type_connection.toLowerCase() == 'pairing') {
    // FIX: Gunakan !folder.startsWith('session') agar folder "session/628xxx" diizinkan!
    if (!folder.startsWith('session')) {
      logWithTime('Jadibot', `Koneksi "${folder}" terputus`, 'merah');
      return false;
    }
    
    const phoneNumber = folder === 'session' ? config.phone_number_bot : numbersString;
    await delay(4000);

    let code;
    const customDeviceName = config.pairingDeviceName || "RYUUBOTT";

    try {
      if (config.useCustomPairing) {
        code = await sock.requestPairingCode(phoneNumber.trim(), customDeviceName);
      } else {
        code = await sock.requestPairingCode(phoneNumber.trim());
      }
    } catch (err) {
      console.log(chalk.yellow(`[System] Gagal request pairing code, beralih ke fallback standard...`));
      code = await sock.requestPairingCode(phoneNumber.trim());
    }

    const formattedCode = code ? code.slice(0, 4) + '-' + code.slice(4) : code;

    console.log(chalk.blue('PHONE NUMBER: '), chalk.yellow(phoneNumber));
    console.log(chalk.blue('CODE PAIRING: '), chalk.yellow(formattedCode));
  }

  // FIX: Pastikan penulisan kredensial aman secara async
  sock.ev.on('creds.update', async () => {
    await saveCreds();
  });

  try {
    setupSessionDirectory(sessionDir);
  } catch {}

  sock.ev.on('contacts.update', (contacts) => {
    contacts.forEach((contact) => {
      store.contacts[contact.id] = contact;
    });
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      eventBus.emit('contactsUpdated', store.contacts);
      const result = serializeMessage(m, sock);
      if (!result) return;

      const { id, message, remoteJid, command } = result;
      const key = message.key;

      try {
        if (config.autoread) {
          await sock.readMessages([key]);
        }
        const validPresenceUpdates = [
          'unavailable',
          'available',
          'composing',
          'recording',
          'paused',
        ];
        if (validPresenceUpdates.includes(config?.PresenceUpdate)) {
          await sock.sendPresenceUpdate(config.PresenceUpdate, remoteJid);
        }

        await processMessage(sock, result);
      } catch (error) {
        // FIX: Tangkap error E2E Signal Session agar tidak dianggap fatal
        if (error.message && (error.message.includes("SessionError") || error.message.includes("No sessions"))) {
          console.log(chalk.yellow(`[E2E LAG] Sinkronisasi enkripsi awal untuk ${remoteJid}... Sesi akan normal pada chat berikutnya.`));
          return;
        }
        console.log(`Terjadi kesalahan saat memproses pesan: ${error}`);
      }
    } catch (error) {
      if (error.message && (error.message.includes("SessionError") || error.message.includes("No sessions"))) return;
      console.log(chalk.redBright(`Error dalam message upsert: ${error.message}`));
    }
  });

  sock.ev.on('group-participants.update', async (m) => {
    if (!m || !m.id || !m.participants || !m.action) {
      logWithTime('System', `Participant tidak valid`);
      return;
    }
    const messageInfo = {
      id: m.id,
      participants: m.participants,
      action: m.action,
      store,
    };

    try {
      await participantUpdate(sock, messageInfo);
    } catch (error) {
      console.log(chalk.redBright(`Terjadi kesalahan di participant Update: ${error}`));
    }
  });

  sock.ev.on('call', async (calls) => {
    if (!config.anticall) return;

    for (let call of calls) {
      if (!call.isGroup && call.status === 'offer') {
        try {
          const callType = call.isVideo ? 'VIDEO' : 'SUARA';
          const userTag = `@${call.from.split('@')[0]}`;
          
          logWithTime('System', `Menerima panggilan masuk dari ${call.from}`);

          try {
            const statusJid = getSenderType(call.from);
            const messageText = `⚠️ _BOT TIDAK DAPAT MENERIMA PANGGILAN ${callType}._\n\n_MAAF ${userTag}, KAMU AKAN DI *BLOCK*._\n_Silakan Hubungi Owner Untuk Membuka Block!_\n_Website: autoresbot.com/contact_`;

            await sendMessageWithMentionNotQuoted(sock, call.from, messageText, statusJid);
            await sleep(2000);
          } catch (msgError) {
            console.log(chalk.yellow(`[ANTI CALL] Gagal mengirim pesan peringatan ke ${call.from}: ${msgError.message}`));
          }

          console.log(chalk.red(`[ANTI CALL] Mengeksekusi blokir untuk ${call.from}...`));
          await sock.updateBlockStatus(call.from, 'block');
          console.log(chalk.green(`[ANTI CALL] Berhasil memblokir ${call.from}`));

        } catch (error) {
          console.log(chalk.redBright(`[ANTI CALL] Terjadi kesalahan fatal saat memblokir: ${error.message}`));
        }
      }
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (sock?.user?.id) {
      global.phone_number_bot = getnumberbot(sock.user.id);
    }

    // ================= QR =================
    if (qr && config.type_connection.toLowerCase() === 'qr') {
      if (folder !== 'session') return;

      qrCount++;
      logWithTime('System', `Menampilkan QR (${qrCount}/5)`);

      qrcode.generate(qr, { small: true });

      if (qrCount >= 5) {
        console.log('Terlalu banyak QR. Stop.');
        process.exit(0);
      }
    }

    // ================= OPEN =================
    if (connection === 'open') {
      reconnectAttempts = 0;
      reconnecting = false;

      setStatusConnected(config.phone_number_bot, true);

      const isSession = folder === 'session';
      success(isSession ? 'System' : 'Jadibot', 'Koneksi Terhubung');
    
      initAutoOrderWorker(sock, 10000);
      initWaasWorker(sock, 15000);

      if (config.autobackup) {
        console.log('Membuat backup data...');

        try {
          const configOwners = Array.isArray(config?.owner_number) ? config.owner_number : [];
          const backupFilePath = await createBackup();
          const documentPath = backupFilePath.path;

          await sock.sendMessage(`${config.phone_number_bot}@s.whatsapp.net`, {
            document: { url: documentPath },
            fileName: 'File Backup',
            mimetype: 'application/zip',
          });

          if (configOwners.length > 0) {
            for (const owner of configOwners) {
              if (typeof owner !== 'string' || !owner.trim()) continue;
              
              let ownerJid = owner.trim();
              if (!ownerJid.includes('@')) {
                ownerJid = `${ownerJid}@s.whatsapp.net`;
              }

              await sock.sendMessage(ownerJid, {
                document: { url: documentPath },
                fileName: 'File Backup',
                mimetype: 'application/zip',
              });
            }
          }
          console.log('✅ [BACKUP SUCCESS]: File backup telah dikirim ke bot dan owner config.');
        } catch (err) {
          console.error('❌ [BACKUP FAILED]:', err.message);
        }
      }

      return;
    }

    // ================= CLOSE =================
    if (connection === 'close') {
      if (reconnecting) return;

      reconnecting = true;
      reconnectAttempts++;

      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

      console.log(
        chalk.yellow(`Reconnect ${reconnectAttempts}/${MAX_RECONNECT} | Reason: ${reason}`),
      );

      setStatusConnected(config.phone_number_bot, false);
      sessions.delete(folder);

      if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.bgRed('Session Logged Out. Stop reconnect.'));
        reconnecting = false;
        return;
      }

      if (reconnectAttempts >= MAX_RECONNECT) {
        console.log(chalk.bgRed('Max reconnect reached. Stop.'));
        reconnecting = false;
        return;
      }

      if (reason === 428) {
        console.log('Restart required. Cooling down 15s...');
        await delay(15000);
      } else if (reason === 403) {
        console.log('Forbidden. Cooling down 30s...');
        await delay(30000);
      } else {
        const backoff = 5000 * reconnectAttempts;
        console.log(`Reconnect in ${backoff / 1000}s`);
        await delay(backoff);
      }

      try {
        sock.ev.removeAllListeners();
        if (sock?.ws?.readyState === 1) {
          sock.ws.close();
        }
      } catch (e) {
        console.log('Cleanup error:', e.message);
      }

      reconnecting = false;
      return connectToWhatsApp(folder);
    }
  });

  return sock;
}

export { connectToWhatsApp };
