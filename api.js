import express from "express";
import fs from "fs";
import path from "path";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "baileys";
import pino from "pino";

// Import Modul Native Autoresbot
import { connectToWhatsApp } from "./lib/connection.js";
import { updateJadibot, listJadibot } from "./lib/jadibot.js";
import { sessions } from "./lib/cache.js";
import config from "./config.js";

// ==========================================
// ⚙️ CONFIGURATION & DEBUG MODE
// ==========================================
const DEBUG_MODE = true;
const PORT = 3000;
const API_SECRET_KEY = "RYUU_SECRET_KEY_12345";
const MAX_FREE_SLOTS = 5;

const DB_DIR = "./database";
const SESSION_PATH = "./session/";
const BLACKLIST_PATH = path.join(DB_DIR, "blacklist.json");
const ADMIN_PATH = path.join(DB_DIR, "admin.json");

const logDebug = (tag, message, data = "") => {
  if (!DEBUG_MODE) return;
  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
  console.log(`[${timeStr}] [${tag}] ${message}`, data ? data : "");
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const app = express();
app.use(express.json());

const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== API_SECRET_KEY) {
    return res.status(401).json({ status: false, message: "Unauthorized: Invalid API Key" });
  }
  next();
};

// --- ENDPOINT: Request Pairing Code ---
app.post("/api/jadibot/request-code", verifyApiKey, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    let senderId = phoneNumber ? phoneNumber.replace(/\D/g, "") : "";

    if (senderId.length < 10 || senderId.length > 15) {
      return res.status(400).json({ status: false, message: "Nomor WhatsApp tidak valid (10-15 digit)." });
    }

    logDebug("REQUEST", `Request pairing code untuk: ${senderId}`);

    // 1. Cek Blacklist
    let blacklist = [];
    if (fs.existsSync(BLACKLIST_PATH)) {
      try { blacklist = JSON.parse(fs.readFileSync(BLACKLIST_PATH, "utf-8")); } catch (e) {}
    }
    if (blacklist.some((item) => item.phoneNumber === senderId)) {
      return res.status(403).json({ status: false, message: "Nomor ini ada di blacklist." });
    }

    // 2. Cek Limit Slot (Max 5 Slot)
    const currentJadibots = await listJadibot();
    const activeCount = Object.values(currentJadibots).filter((b) => b.status === "active").length;
    if (activeCount >= MAX_FREE_SLOTS) {
      return res.status(429).json({ status: false, message: "Slot bot gratis saat ini penuh." });
    }

    // 3. Bersihkan Socket & Folder Session Corrupt Lama jika ada
    const folderKey = `session/${senderId}`;
    if (sessions.has(folderKey)) {
      logDebug("CLEAN", `Closing existing session in cache: ${folderKey}`);
      try { sessions.get(folderKey).ws.close(); } catch (e) {}
      sessions.delete(folderKey);
    }

    const sessionFolder = path.join(SESSION_PATH, senderId);
    
    // Hapus sisa creds corrupt agar tidak terjadi error 401 saat pair ulang
    if (fs.existsSync(sessionFolder)) {
      logDebug("CLEAN_DIR", `Removing old session folder to prevent 401 error...`);
      try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch (e) {}
    }
    await fs.promises.mkdir(sessionFolder, { recursive: true });

    await updateJadibot(senderId, "inactive");

    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      auth: state,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    sock.ev.on("creds.update", saveCreds);

    // MENDENGARKAN EVENT LOGIN: Hanya saat user selesai input kode & WA terhubung, baru serahkan ke connectToWhatsApp!
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      logDebug("LIVE_WS", `[${senderId}] Connection Status: ${connection}`);

      if (connection === "open") {
        logDebug("SUCCESS", `🎉 PAIRING BERHASIL! Menyerahkan session ke connectToWhatsApp...`);
        await updateJadibot(senderId, "active");
        
        // Tutup socket pendaftaran API agar tidak bentrok 401 dengan connectToWhatsApp
        try { sock.ev.removeAllListeners(); sock.ws.close(); } catch (e) {}
        
        // Jalankan Engine Native Autoresbot!
        await connectToWhatsApp(`session/${senderId}`);
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        logDebug("DISCONNECT", `[${senderId}] Closed Reason Code: ${statusCode}`);

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
          logDebug("LOGOUT", `Session 401/LoggedOut. Deleting session folder.`);
          await updateJadibot(senderId, "stop");
          try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch (e) {}
        } else if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
          logDebug("RESTART_REQUIRED", `Restarting via connectToWhatsApp...`);
          try { sock.ev.removeAllListeners(); sock.ws.close(); } catch (e) {}
          await connectToWhatsApp(`session/${senderId}`);
        }
      }
    });

    await delay(3500);

    const customDeviceName = config.pairingDeviceName || "RYUUBOTT";
    let rawCode;

    try {
      logDebug("PAIRING", `Requesting pairing code [${customDeviceName}]...`);
      rawCode = await sock.requestPairingCode(senderId, customDeviceName);
    } catch (errCustom) {
      logDebug("FALLBACK", `Custom device name error. Trying standard code...`);
      await delay(2000);
      rawCode = await sock.requestPairingCode(senderId);
    }

    if (!rawCode) {
      return res.status(500).json({ status: false, message: "Gagal mengambil kode pairing dari WhatsApp." });
    }

    const formattedCode = rawCode.slice(0, 4) + "-" + rawCode.slice(4);
    logDebug("SUCCESS_CODE", `Pairing Code Generated: ${formattedCode}`);

    return res.status(200).json({
      status: true,
      message: "Kode pairing berhasil dibuat.",
      data: {
        phoneNumber: senderId,
        pairingCode: formattedCode,
        deviceName: customDeviceName,
      },
    });
  } catch (error) {
    logDebug("EXCEPTION", `API Error: ${error.message}`);
    return res.status(500).json({ status: false, message: `Error: ${error.message}` });
  }
});

// Admin Routes
app.post("/api/admin/login", verifyApiKey, (req, res) => {
  const { username, password } = req.body;
  if (!fs.existsSync(ADMIN_PATH)) return res.status(500).json({ status: false, message: "Admin DB not found." });
  const adminData = JSON.parse(fs.readFileSync(ADMIN_PATH, "utf-8"));
  if (username === adminData.username && password === adminData.password) {
    return res.status(200).json({ status: true, message: "Login Berhasil", token: "RYUU_ADMIN_SESSION_TOKEN_OK" });
  }
  return res.status(401).json({ status: false, message: "Username atau Password Admin salah!" });
});

app.get("/api/admin/blacklist", verifyApiKey, (req, res) => {
  let blacklist = [];
  if (fs.existsSync(BLACKLIST_PATH)) blacklist = JSON.parse(fs.readFileSync(BLACKLIST_PATH, "utf-8"));
  return res.status(200).json({ status: true, data: blacklist });
});

app.post("/api/admin/blacklist/add", verifyApiKey, (req, res) => {
  const { phoneNumber, reason } = req.body;
  let targetNumber = phoneNumber ? phoneNumber.replace(/\D/g, "") : "";
  if (!targetNumber) return res.status(400).json({ status: false, message: "Nomor HP wajib diisi." });
  let blacklist = [];
  if (fs.existsSync(BLACKLIST_PATH)) blacklist = JSON.parse(fs.readFileSync(BLACKLIST_PATH, "utf-8"));
  if (blacklist.some((item) => item.phoneNumber === targetNumber)) {
    return res.status(400).json({ status: false, message: "Nomor sudah ada di blacklist." });
  }
  blacklist.push({ phoneNumber: targetNumber, reason: reason || "Di-ban oleh Admin", bannedAt: new Date().toISOString() });
  fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(blacklist, null, 2));
  return res.status(200).json({ status: true, message: `Nomor ${targetNumber} berhasil di-blacklist!` });
});

app.post("/api/admin/blacklist/remove", verifyApiKey, (req, res) => {
  const { phoneNumber } = req.body;
  let targetNumber = phoneNumber ? phoneNumber.replace(/\D/g, "") : "";
  let blacklist = [];
  if (fs.existsSync(BLACKLIST_PATH)) blacklist = JSON.parse(fs.readFileSync(BLACKLIST_PATH, "utf-8"));
  const newBlacklist = blacklist.filter((item) => item.phoneNumber !== targetNumber);
  fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(newBlacklist, null, 2));
  return res.status(200).json({ status: true, message: `Nomor ${targetNumber} dihapus dari blacklist.` });
});

app.listen(PORT, () => logDebug("SYSTEM", `🚀 API Bot WA Running on Port ${PORT}`));
