/*
⚠️ PERINGATAN:
Script ini **TIDAK BOLEH DIPERJUALBELIKAN** dalam bentuk apa pun!

╔══════════════════════════════════════════════╗
║                🛠️ INFORMASI SCRIPT           ║
╠══════════════════════════════════════════════╣
║ 📦 Version   : 4.1.5
║ 👨‍💻 Developer  : Azhari Creative              ║
║ 🌐 Website    : https://autoresbot.com       ║
║ 💻 GitHub  : github.com/autoresbot/resbot-md ║
╚══════════════════════════════════════════════╝

📌 Mulai 1 April 2025,
Script **Autoresbot** resmi menjadi **Open Source** dan dapat digunakan secara gratis:
🔗 https://autoresbot.com
*/

import fs from "fs";
import path from "path";
import os from "os";
import chalk from "chalk";
import axios from "axios";
import config from "../config.js";
import { success, danger } from "../lib/utils.js";
import { connectToWhatsApp } from "../lib/connection.js";
import { listJadibot } from "../lib/jadibot.js";

const TERMINAL_WIDTH = process.stdout.columns || 45; // Default ke 45 jika tidak tersedia
const ALIGNMENT_PADDING = 5;
const JADIBOT_BOOT_DELAY_MS = 2500; // Jeda antar sub-bot agar RAM tidak lonjak mendadak

const banner = `
██████╗ ███████╗███████╗██████╗  ██████╗ ████████╗
██╔══██╗██╔════╝██╔════╝██╔══██╗██╔═══██╗╚══██╔══╝
██████╔╝█████╗  ███████╗██████╔╝██║   ██║   ██║
██╔══██╗██╔══╝  ╚════██║██╔══██╗██║   ██║   ██║
██║  ██║███████╗███████║██████╔╝╚██████╔╝   ██║
╚═╝  ╚═╝╚══════╝╚══════╝╚═════╝  ╚═════╝    ╚═╝
`;

const horizontalLine = (length = TERMINAL_WIDTH, char = "=") =>
  char.repeat(length);

let cachedIP = null;

const getPublicIP = async () => {
  if (cachedIP) {
    return cachedIP;
  }

  const ipServices = [
    "https://api.ipify.org?format=json",
    "https://ipv4.icanhazip.com",
    "https://ifconfig.me/ip",
  ];

  for (const url of ipServices) {
    try {
      const response = await axios.get(url);

      let ip;
      if (
        response.data &&
        typeof response.data === "object" &&
        response.data.ip
      ) {
        ip = response.data.ip;
      } else if (typeof response.data === "string") {
        ip = response.data.trim();
      }

      if (ip) {
        cachedIP = ip;
        return cachedIP;
      }
    } catch (error) {
      // Lanjut ke URL berikutnya jika gagal
      continue;
    }
  }

  throw new Error("Tidak dapat mengambil IP publik dari semua layanan");
};

const getServerSpecs = async () => ({
  hostname: os.hostname(),
  platform: os.platform(),
  arch: os.arch(),
  totalMemory: `${(os.totalmem() / 1024 ** 3).toFixed(2)} GB`,
  freeMemory: `${(os.freemem() / 1024 ** 3).toFixed(2)} GB`,
  uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
  publicIp: await getPublicIP(),
  mode: config.mode,
});

const getProcessUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
  };
};

const getStatusApikey = async () => {
  try {
    const response = await axios.get(
      `https://api.autoresbot.com/check_apikey?apikey=${config.APIKEY}`
    );
    const { limit_apikey } = response.data || {};
    if (limit_apikey <= 0) return chalk.redBright("Limit Habis");
    return chalk.green(limit_apikey);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      const errorCode = data?.error_code;
      const errorMessage = data?.message;

      if (status === 403) return status;
      if (status === 404)
        return chalk.redBright("Not Found: Invalid endpoint or resource");
      if (status === 401) return chalk.redBright("INVALID APIKEY");

      if (errorCode === "LIMIT_REACHED")
        return chalk.redBright(
          `APIKEY LIMIT (${errorMessage || "No message"})`
        );
      if (errorCode === "INVALID_API_KEY")
        return chalk.redBright("INVALID APIKEY");
      if (errorCode === "MISSING_API_KEY")
        return chalk.redBright("INVALID APIKEY");
    }
    return chalk.red("Error fetching API status");
  }
};

async function showServerInfo(e = {}) {
  const { title: t = "RESBOT", borderChar: o = "=", color: i = "cyan" } = e,
    n = {
      horizontalLayout: TERMINAL_WIDTH > 40 ? "default" : "fitted",
      width: Math.min(TERMINAL_WIDTH - 4, 40),
    },
    a = await getServerSpecs(),
    s = await getStatusApikey();
  if (403 == s) {
    console.log("--------------------"),
      danger("Error ⚠️", "Forbidden: API key is not authorized"),
      danger(
        "Error ⚠️",
        `Solusi: Tambahkan ip anda ${await getPublicIP()} ke dalam whitelist`
      ),
      success("IP", await getPublicIP()),
      success("Info", "Kunjungi linknya dan tambahkan ip kamu"),
      console.log("https://autoresbot.com/services/rest-api"),
      console.log("--------------------");
    const e = (e) => new Promise((t) => setTimeout(t, e));
    return await e(3e4), void process.exit();
  }
  const r = [
      "◧ Hostname",
      "◧ Platform",
      "◧ Architecture",
      "◧ Total Memory",
      "◧ Free Memory",
      "◧ Uptime",
      "◧ Public IP",
      "◧ Mode",
    ],
    l = Object.values(a),
    c = Math.max(...r.map((e) => e.length)),
    u = r
      .map((e, t) => `${chalk.green(e.padEnd(c + ALIGNMENT_PADDING))}: ${l[t]}`)
      .join("\n");
  return console.log(
    `\n${chalk[i](horizontalLine(TERMINAL_WIDTH, o))}\n${chalk[i](
      banner
    )}\n${chalk[i](horizontalLine(TERMINAL_WIDTH, o))}\n\n${chalk.yellow.bold(
      "◧ Info Script :"
    )}\n${chalk.green("Version Sc:")} Resbot ${global.version}\n${chalk.green(
      "API Key :"
    )} ${s}\n${chalk.yellow.bold("------------------")}\n${chalk.yellow.bold(
      "◧ Server Specifications :"
    )}\n${u}\n\n${chalk[i](horizontalLine(TERMINAL_WIDTH, o))}\n${chalk[i].bold(
      " ◧ Thank you for using this script! ◧ "
    )}\n${chalk[i](horizontalLine(TERMINAL_WIDTH, o))}\n`
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isValidJadibotSession(number) {
  const cleanNumber = String(number || "").replace(/\D/g, "");
  if (!cleanNumber) return false;

  const sessionFolder = path.join(process.cwd(), "session", cleanNumber);
  const credsFile = path.join(sessionFolder, "creds.json");

  return fs.existsSync(sessionFolder) && fs.existsSync(credsFile);
}

async function restoreJadibotSessions() {
  try {
    const jadibots = await listJadibot();
    if (!jadibots || typeof jadibots !== "object") return;

    const candidates = Object.entries(jadibots).filter(([number, data]) => {
      const status = data?.status;
      if (status === "stop" || status === "logout") return false;
      return isValidJadibotSession(number);
    });

    if (candidates.length === 0) {
      console.log(chalk.gray("[JADIBOT] Tidak ada sesi jadibot valid untuk di-restore."));
      return;
    }

    console.log(
      chalk.cyan(`[JADIBOT] Memulihkan ${candidates.length} sesi aktif secara bertahap...`)
    );

    for (const [number] of candidates) {
      const cleanNumber = String(number).replace(/\D/g, "");
      const folderPath = `session/${cleanNumber}`;

      try {
        console.log(chalk.blue(`[JADIBOT] Menjalankan ${folderPath}...`));
        await connectToWhatsApp(folderPath);
      } catch (err) {
        console.error(chalk.red(`[JADIBOT] Gagal restore ${cleanNumber}:`), err.message);
      }

      await sleep(JADIBOT_BOOT_DELAY_MS);
    }
  } catch (error) {
    console.error(chalk.red("[JADIBOT] Error saat membaca daftar jadibot:"), error.message);
  }
}

async function start_app() {
  await showServerInfo();

  // 1. Jalankan bot utama terlebih dahulu
  await connectToWhatsApp();

  // 2. Restore sesi jadibot yang valid di latar belakang bertahap
  setTimeout(() => {
    restoreJadibotSessions();
  }, 3000);
}

export { showServerInfo, start_app, getServerSpecs, getProcessUsage };
