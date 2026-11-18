import { promises as fsp } from "fs";

const coupleJson = "./database/couple.json";
let savingQueueCouple = Promise.resolve();
let dbCouple = [];

async function fileExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadCouple() {
  try {
    if (!(await fileExists(coupleJson))) {
      await fsp.writeFile(coupleJson, JSON.stringify([], null, 2), "utf8");
    }
    const data = await fsp.readFile(coupleJson, "utf8");
    dbCouple = JSON.parse(data);
    if (!Array.isArray(dbCouple)) dbCouple = [];
  } catch (error) {
    console.error("❌ Error loading couple file:", error);
    dbCouple = [];
  }
}

async function saveCouple() {
  savingQueueCouple = savingQueueCouple.then(async () => {
    try {
      await fsp.writeFile(coupleJson, JSON.stringify(dbCouple, null, 2), "utf8");
    } catch (error) {
      console.error("❌ Error saving couple file:", error);
    }
  });
}

// Cek status partner user (active)
function getCouple(jid) {
  return dbCouple.find(
    (c) => (c.user1 === jid || c.user2 === jid) && c.status === "active"
  );
}

// Cek pending request
function getPendingCouple(jid) {
  return dbCouple.find(
    (c) => (c.user1 === jid || c.user2 === jid) && c.status === "pending"
  );
}

// Buat request nembak baru
function sendCoupleRequest(user1, user2) {
  dbCouple = dbCouple.filter((c) => c.user1 !== user1 && c.user2 !== user1);

  dbCouple.push({
    id: "couple_" + Date.now(),
    user1: user1,
    user2: user2,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  saveCouple();
  return true;
}

// Terima pacaran
function acceptCouple(user2) {
  const index = dbCouple.findIndex(
    (c) => c.user2 === user2 && c.status === "pending"
  );
  if (index === -1) return false;

  dbCouple[index].status = "active";
  dbCouple[index].acceptedAt = new Date().toISOString(); // Waktu resmi jadian
  saveCouple();
  return dbCouple[index];
}

// Putus hubungan / Hapus couple
function removeCouple(jid) {
  const initialLength = dbCouple.length;
  dbCouple = dbCouple.filter((c) => c.user1 !== jid && c.user2 !== jid);
  if (dbCouple.length !== initialLength) {
    saveCouple();
    return true;
  }
  return false;
}

// 🆕 Fungsi Hitung Total Durasi Couple (Mengembalikan format hari/jam)
function hitungTotalDurasiCouple(acceptedAtIso) {
  if (!acceptedAtIso) return "0 hari";
  
  const start = new Date(acceptedAtIso).getTime();
  const now = Date.now();
  const diffMs = now - start;

  if (diffMs < 0) return "0 hari";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) {
    const remainingDays = days % 365;
    return `${years} tahun ${remainingDays} hari`;
  } else if (months > 0) {
    const remainingDays = days % 30;
    return `${months} bulan ${remainingDays} hari`;
  } else if (days > 0) {
    return `${days} hari`;
  } else if (hours > 0) {
    return `${hours} jam`;
  } else {
    return `${Math.max(1, minutes)} menit`;
  }
}

loadCouple();
setInterval(saveCouple, 60 * 1000);

export {
  getCouple,
  getPendingCouple,
  sendCoupleRequest,
  acceptCouple,
  removeCouple,
  hitungTotalDurasiCouple,
  saveCouple,
};
