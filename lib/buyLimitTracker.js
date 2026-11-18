import fs from "fs";
import path from "path";
import moment from "moment-timezone";

const dbPath = path.resolve("database/additional/buylimit.json");

// Pastikan file database JSON-nya ada
const ensureDatabase = () => {
  if (!fs.existsSync(dbPath)) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      dbPath,
      JSON.stringify({ lastReset: moment().tz("Asia/Jakarta").format("YYYY-MM-DD"), users: {} }, null, 2)
    );
  }
};

// Baca data
const readDb = () => {
  ensureDatabase();
  try {
    const data = fs.readFileSync(dbPath, "utf-8");
    const parsed = JSON.parse(data);
    
    // Cek apakah sudah berganti hari (Auto Reset Harian)
    const today = moment().tz("Asia/Jakarta").format("YYYY-MM-DD");
    if (parsed.lastReset !== today) {
      return { lastReset: today, users: {} };
    }
    return parsed;
  } catch (err) {
    return { lastReset: moment().tz("Asia/Jakarta").format("YYYY-MM-DD"), users: {} };
  }
};

// Simpan data
const writeDb = (data) => {
  ensureDatabase();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

/**
 * Cek dan ambil data limit yang sudah dibeli hari ini oleh user
 * @param {string} sender 
 * @returns {number} jumlah limit yang sudah dibeli hari ini
 */
export function getDailyBoughtLimit(sender) {
  const db = readDb();
  // Jika hari berubah otomatis di-reset lewat fungsi baca
  return db.users[sender] || 0;
}

/**
 * Tambah catatan pembelian limit harian user
 * @param {string} sender 
 * @param {number} amount 
 */
export function addDailyBoughtLimit(sender, amount) {
  const db = readDb();
  const today = moment().tz("Asia/Jakarta").format("YYYY-MM-DD");
  
  if (db.lastReset !== today) {
    db.lastReset = today;
    db.users = {};
  }

  db.users[sender] = (db.users[sender] || 0) + amount;
  writeDb(db);
}

/**
 * Reset manual database harian buylimit (jika dipanggil scheduler/owner)
 */
export function resetDailyBuyLimit() {
  const db = readDb();
  db.lastReset = moment().tz("Asia/Jakarta").format("YYYY-MM-DD");
  db.users = {};
  writeDb(db);
}
