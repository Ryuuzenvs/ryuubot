import axios from "axios";
import config from "../config.js";
import { findUser, updateUser, addOwner } from "./users.js";

// ID Group untuk kirim laporan orderan selesai
const ID_GROUP_TARGET = config.id_group_auto_order || "120363429467773375@g.us";

// In-Memory Lock untuk mencegah orderan sama diproses 2x akibat race condition
const processingOrders = new Set();

/**
 * Helper untuk membersihkan & mendapatkan JID WhatsApp resmi
 */
function parseJid(phone) {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  return `${clean}@s.whatsapp.net`;
}

/**
 * Eksekutor pemberian produk ke user di Database Bot
 */
async function processOrderDelivery(order) {
  const { user_phone, category, product_name, variant_name, value } = order;
  const targetJid = parseJid(user_phone);
  const cleanNumber = user_phone.replace(/\D/g, "");

  // Cari user di database
  let userDataPair = findUser(targetJid);
  
  // Normalisasi string pencarian kategori & nama produk
  const cat = (category || "").toLowerCase();
  const prod = (product_name || "").toLowerCase();
  const rawValue = parseInt(value) || 1; // Default fallback jika ada format '1d'

  // --- 1. KATEGORI: LIMIT ---
  if (cat.includes("limit") || prod.includes("limit")) {
    const [docId, userData] = userDataPair || [targetJid, {}];
    const currentPaidLimit = userData.paidLimit || 0;
    
    updateUser(targetJid, {
      paidLimit: currentPaidLimit + rawValue,
    });
    return `Berhasil menambahkan *${rawValue} Paid Limit* ke nomor @${cleanNumber}.`;
  }

  // --- 2. KATEGORI: MONEY ---
  if (cat.includes("money") || prod.includes("money")) {
    const [docId, userData] = userDataPair || [targetJid, {}];
    const currentMoney = userData.money || 0;

    updateUser(targetJid, {
      money: currentMoney + rawValue,
    });
    return `Berhasil menambahkan *Rp ${rawValue.toLocaleString("id-ID")} Money* ke nomor @${cleanNumber}.`;
  }

  // --- 3. KATEGORI: PREMIUM ---
  if (cat.includes("premium") || prod.includes("premium")) {
    const [docId, userData] = userDataPair || [targetJid, {}];
    
    // Tentukan acuan tanggal mulai (jika user sudah premium & belum expired, tinggal sambung)
    let baseDate = new Date();
    if (userData.premium) {
      const existingPrem = new Date(userData.premium);
      if (!isNaN(existingPrem) && existingPrem > new Date()) {
        baseDate = existingPrem;
      }
    }
    
    baseDate.setDate(baseDate.getDate() + rawValue);
    
    updateUser(targetJid, {
      premium: baseDate.toISOString(),
    });
    return `Berhasil memperpanjang *Akses Premium* selama *${rawValue} Hari* untuk @${cleanNumber}.`;
  }

  // --- 4. KATEGORI: OWNER ---
  if (cat.includes("owner") || prod.includes("owner")) {
    const durationParam = rawValue.toString();
    addOwner(cleanNumber, durationParam);
    return `Berhasil menambahkan nomor @${cleanNumber} sebagai *Owner Bot* selama *${rawValue} Hari*.`;
  }

  throw new Error(`Kategori atau Produk '${category} - ${product_name}' tidak dikenali oleh sistem bot.`);
}

/**
 * Main Polling Function
 */
export async function runAutoOrderPolling(sock) {
  const baseUrl = config.url_bot_auto_order.startsWith("http")
    ? config.url_bot_auto_order
    : `http://${config.url_bot_auto_order}`;
    
  const endpoint = `${baseUrl}/api/v1/bot/orders/pending-fulfill`;
  const apiKey = config.bot_auto_order_apikey;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        "X-BOT-API-KEY": apiKey,
        "Accept": "application/json",
      },
      timeout: 8000, // Timeout 8 detik biar gak menggantung
    });

    const pendingOrders = response.data?.data || [];
    if (!Array.isArray(pendingOrders) || pendingOrders.length === 0) {
      return;
    }

    for (const order of pendingOrders) {
      const { order_code } = order;

      // Cek jika order sedang diproses di iterasi sebelumnya
      if (processingOrders.has(order_code)) continue;

      // Lock order ID
      processingOrders.add(order_code);

      try {
        // 1. Eksekusi item ke database bot
        const resultMsg = await processOrderDelivery(order);

        // 2. Tandai Completed ke Server Web Laravel
        const fulfillUrl = `${baseUrl}/api/v1/bot/orders/${order_code}/fulfill`;
        await axios.post(fulfillUrl, {}, {
          headers: {
            "X-BOT-API-KEY": apiKey,
            "Accept": "application/json",
          },
          timeout: 8000,
        });

        // 3. Kirim Notifikasi Sukses ke Group WA Target
        const caption = 
          `Shopping Bag *─── [ AUTO ORDER SUCCESS ] ───*\n\n` +
          `Daftar Notifikasi Orderan Masuk:\n` +
          `• *ID Order:* \`${order.order_code}\` \n` +
          `• *Pembeli:* @${order.user_phone.replace(/\D/g, "")}\n` +
          `• *Produk:* ${order.product_name} (${order.variant_name})\n` +
          `• *Status:* Success / Fulfilled\n\n` +
          `📌 *Keterangan Server:* ${resultMsg}\n\n` +
          `_Terima kasih telah bertransaksi secara otomatis!_`;

        await sock.sendMessage(ID_GROUP_TARGET, {
          text: caption,
          mentions: [parseJid(order.user_phone)],
        });

      } catch (err) {
        console.error(`❌ [AutoOrder] Gagal memproses ${order_code}:`, err.response?.data || err.message);
      } finally {
        // Release Lock
        processingOrders.delete(order_code);
      }
    }
  } catch (error) {
    // Handling silently jika koneksi / backend web Laravel off
    if (error.code !== "ECONNREFUSED") {
      console.error("⚠️ [AutoOrder Polling Error]:", error.message);
    }
  }
}

/**
 * Worker Init Function
 */
export function initAutoOrderWorker(sock, intervalMs = 10000) {
  console.log("🚀 [AutoOrder Worker] Polling service telah diaktifkan (Interval: 10 detik).");
  
  // Jalankan interval tiap 10s
  setInterval(() => {
    runAutoOrderPolling(sock);
  }, intervalMs);
}
