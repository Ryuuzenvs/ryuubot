/*
⚠️ PERINGATAN:
Script ini **TIDAK BOLEH DIPERJUALBELIKAN** dalam bentuk apa pun!

╔══════════════════════════════════════════════╗
║                🛠️ INFORMASI SCRIPT           ║
╠══════════════════════════════════════════════╣
║ 📦 Version   : 5.1.3
║ 👨‍💻 Developer  : Azhari Creative              ║
║ 🌐 Website    : https://autoresbot.com       ║
║ 💻 GitHub  : github.com/autoresbot/resbot-md ║
╚══════════════════════════════════════════════╝

📌 Mulai 11 April 2025,
Script **Autoresbot** resmi menjadi **Open Source** dan dapat digunakan secara gratis:
🔗 https://autoresbot.com
*/
// List command tanpa registrasi
export const commandWithoutRegister = ['list', 'owner', 'menu', 'claim'];

// Import ESM
import chokidar from 'chokidar';
import config from './config.js';
const mode = config.mode;

import { findGroup } from './lib/group.js';
import chalk from 'chalk';
import handler from './lib/handler.js';
import mess from './strings.js';
import { updateParticipant } from './lib/cache.js';

import path from 'path';
import { handleActiveFeatures } from './lib/participant_update.js';

import { logWithTime, log, danger, findClosestCommand, logTracking } from './lib/utils.js';

import { isOwner, isPremiumUser, updateUser, findUser, isUserRegistered } from './lib/users.js';

import { reloadPlugins } from './lib/plugins.js';
import { logCustom } from './lib/logger.js';

handler.initHandlers();

// Variabel global
const lastMessageTime = {};
const pluginsPath = path.join(process.cwd(), 'plugins');
const lastSent_participantUpdate = {};
let plugins = [];

// Load plugin awal
reloadPlugins()
  .then((loadedPlugins) => {
    plugins = loadedPlugins;
    console.log(`[✔] Load All Plugins done...`);
  })
  .catch((error) => {
    console.error('❌ ERROR: Gagal memuat plugins:', error);
  });

// Hot reload hanya di development
if (mode === 'development') {
  const watcher = chokidar.watch(pluginsPath, {
    persistent: true,
    ignoreInitial: true,
    ignored: /(^|[\/\\])\../, // Abaikan file tersembunyi
  });

  watcher.on('change', (filePath) => {
    if (filePath.endsWith('.js')) {
      logWithTime('System', `File changed: ${filePath}`);

      reloadPlugins()
        .then((loadedPlugins) => {
          plugins = loadedPlugins;
        })
        .catch((error) => {
          console.error('❌ ERROR: Gagal memuat plugins:', error);
        });
    }
  });

  logWithTime('System', 'Hot reload active in development mode.');
} else {
  logWithTime('System', 'Hot reload disabled in production mode.');
}

// Fungsi utama untuk memproses pesan
// Ganti bagian awal fungsi processMessage kamu menjadi seperti ini:
async function processMessage(sock, messageInfo) {
  const { remoteJid, isGroup, message, sender, pushName, fullText, prefix, command } = messageInfo;

  // ╔════════════════════════════════════════════════════════════╗
  // ║               TRACKING DEBUGGING UTAMA                     ║
  // ╚════════════════════════════════════════════════════════════╝
  console.log(chalk.yellow(`\n=== [DEBUG] ADA PESAN MASUK ===`));
  console.log(chalk.cyan(`• RemoteJid : `), remoteJid);
  console.log(chalk.cyan(`• Sender    : `), sender);
  console.log(chalk.cyan(`• IsGroup   : `), isGroup);
  console.log(chalk.cyan(`• PushName  : `), pushName);
  console.log(chalk.cyan(`• Prefix    : `), prefix);
  console.log(chalk.cyan(`• Command   : `), command);
  console.log(chalk.cyan(`• FullText  : `), fullText);
  console.log(chalk.yellow(`================================\n`));

  const isPremiumUsers = isPremiumUser(sender);
  const isOwnerUsers = isOwner(sender);

  try {
    const shouldContinue = await handler.preProcess(sock, messageInfo);
    
    // DEBUG 2: Cek apakah lolos dari preProcess handler
    console.log(chalk.magenta(`[DEBUG] Lolos preProcess? ->`), shouldContinue);
    if (!shouldContinue) return; 

    // Rate limiter
    let truncatedContent = fullText.length > 10 ? fullText.slice(0, 10) + '...' : fullText;

    const currentTime = Date.now();
    if (
      lastMessageTime[remoteJid] &&
      currentTime - lastMessageTime[remoteJid] < config.rate_limit &&
      prefix &&
      !isOwnerUsers
    ) {
      danger(pushName, `Rate limit : ${truncatedContent}`);
      return;
    }
    if (prefix) {
      lastMessageTime[remoteJid] = currentTime;
    }

    if (truncatedContent.trim() && prefix) {
      const logMessage =
        config.mode === 'production'
          ? () => log(pushName, truncatedContent)
          : () => logWithTime('CHAT', `${pushName}(${sender.split('@')[0]}) - ${truncatedContent}`);

      logMessage();
    }

    // DEBUG 3: Cek kondisi filter Destination sebelum dieksekusi
    console.log(chalk.blue(`[DEBUG] Cek Destination:`));
    console.log(chalk.blue(`• config.bot_destination : `), config.bot_destination);
    console.log(chalk.blue(`• isOwnerUsers           : `), isOwnerUsers);

    // Handle Destination
    if (
      (config.bot_destination.toLowerCase() === 'private' && isGroup) ||
      (config.bot_destination.toLowerCase() === 'group' && !isGroup)
    ) {
      if (!isOwnerUsers) {
        // DEBUG 4: Jalur block destination terpicu
        console.log(chalk.red(`[DEBUG] !!! CHAT BLOCKED OLEH DESTINATION FILTER !!!`));
        logWithTime('SYSTEM', `Destination handle only - ${config.bot_destination} chat`);
        return;
      }
    }

    console.log(chalk.green(`[DEBUG] Lolos filter destination! Mulai scanning plugins...`));

    
    // ... Sisa kode ke bawah (looping plugins) biarkan bawaan aslinya

    let commandFound = false;

    // Iterasi melalui semua plugin untuk menemukan perintah yang sesuai
    for (const plugin of plugins) {
      if (plugin.Commands.includes(command)) {
        commandFound = true;

        // Cek apakah perintah ini hanya untuk pengguna premium
        if (plugin.OnlyPremium && !isPremiumUsers && !isOwnerUsers) {
          logTracking(`Handler - Bukan premium (${command})`);
          await sock.sendMessage(remoteJid, { text: mess.general.isPremium }, { quoted: message });
          return;
        }

        // Cek apakah perintah ini hanya untuk owner
        if (plugin.OnlyOwner && !isOwnerUsers) {
          logTracking(`Handler - Bukan Owner (${command})`);
          await sock.sendMessage(remoteJid, { text: mess.general.isOwner }, { quoted: message });
          return;
        }

        //  fitur baru disini
        // OnlyAdmin: false, // default false
        // OnlyGroup: false, // default false
        // OnlyPrivate: false // default false

        let isGrubPremium = false;
        const settingGroups = await findGroup(remoteJid);
        if (settingGroups?.fitur?.premium && new Date(settingGroups.fitur.premium) > new Date()) {
          // Premium masih aktif
          isGrubPremium = true;
        }

        // Cek apakah perintah ini menggunakan limit
        if (!isPremiumUsers && !isOwnerUsers && plugin.limitDeduction && !isGrubPremium) {
          try {
            const dataUsers = await findUser(sender);
            if (!dataUsers) return;

            const [docId, userData] = dataUsers;

            const isLimitExceeded = userData.limit < plugin.limitDeduction || userData.limit < 1;
            if (isLimitExceeded) {
              logTracking('Handler - Limit habis ');
              await sock.sendMessage(remoteJid, { text: mess.general.limit }, { quoted: message });
              return;
            }

            // Kurangi limit pengguna jika masih cukup
            await updateUser(sender, {
              limit: userData.limit - plugin.limitDeduction,
            });
          } catch (error) {
            console.error(`Terjadi kesalahan saat mengurangi limit pengguna: ${error.message}`);
          }
        }

        const pluginResult = await plugin.handle(sock, messageInfo);

        logTracking(`Plugins - ${command} dijalankan oleh ${sender}`);

        // Cek apakah plugin meminta untuk menghentikan eksekusi
        if (pluginResult === false) {
          return;
        }
      }
    }

    // sampai sini command tidak di temukan
    if (config.commandSimilarity && !commandFound) {
      const closestCommand = findClosestCommand(command, plugins);
      if (closestCommand && command != '' && fullText.length < 20 && prefix) {
        logTracking(`Handler - Command tidak ditemukan (${command})`);
        logCustom(
          'info',
          `_Command *${command}* tidak ditemukan_ \n\n_Apakah maksud Anda *.${closestCommand}*?_`,
          `ERROR-COMMAND-NOT-FOUND.txt`,
        );
        return await sock.sendMessage(
          remoteJid,
          {
            text: `_Command *${command}* tidak ditemukan_ \n\n_Apakah maksud Anda *.${closestCommand}*?_`,
          },
          { quoted: message },
        );
      }
    }
  } catch (error) {
    logCustom('info', error, `ERROR-processMessage.txt`);
    danger(command, `Kesalahan di processMessage: ${error}`);
  }
}

async function participantUpdate(sock, messageInfo) {
  const { id, action, participants } = messageInfo;
  const now = Date.now();

  try {
    const settingGroups = await findGroup(id);
    const validActions = ['promote', 'demote', 'add', 'remove'];

    if (validActions.includes(action)) {
      try {
        updateParticipant(sock, id, participants, action);
      } catch (e) {
        console.log('error updateParticipant ');
      }
    } else {
      return console.log('action tidak valid :', action);
    }
    // Jika grup ditemukan
    if (settingGroups) {
      if (lastSent_participantUpdate[id]) {
        if (now - lastSent_participantUpdate[id] < config.rate_limit) {
          return console.log(chalk.redBright(`Rate limit : ${id}`));
        }
      }
      lastSent_participantUpdate[id] = now;

      await handleActiveFeatures(sock, messageInfo, settingGroups.fitur);
    }
  } catch (error) {
    logCustom('info', error, `ERROR-participantUpdate.txt`);
    console.error(chalk.redBright(`Error: ${error.message}`));
  }
}

export { processMessage, participantUpdate };
