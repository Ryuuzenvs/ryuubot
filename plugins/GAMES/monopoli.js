import { 
  addUser, 
  removeUser, 
  getUser, 
  isUserPlaying, 
  updateGame 
} from "../../database/temporary_db/monopoli.js";
import { createMonopoliGame, renderBoardStatus, BOARD_SIZE } from "../../lib/games/monopoli.js";
import { sendMessageWithMention } from "../../lib/utils.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message, sender, fullText } = messageInfo;
  const commandText = fullText.toLowerCase().trim();

  // 1. Memulai atau Mengajak Join Game (.mn atau .mn join)
  if (commandText === ".mn" || commandText === ".mn join" || commandText === ".monopoli" || commandText === ".monopoli join") {
    if (!isUserPlaying(remoteJid)) {
      // Buat room baru jika belum ada
      const newSession = createMonopoliGame(sender, "Pemain 1");
      addUser(remoteJid, newSession);
      return await sendMessageWithMention(
        sock, remoteJid, 
        `🎮 *Monopoli Room Berhasil Dibuat!*\n\n@${sender.split("@")[0]} telah bergabung.\nPemain lain ketik *.mn join* untuk ikutan.\nJika sudah berkumpul, ketik *.mn start*`, 
        message
      );
    } else {
      const data = getUser(remoteJid);
      if (data.state === "PLAYING") {
        return await sock.sendMessage(remoteJid, { text: "❌ Game sedang berjalan!" }, { quoted: message });
      }
      
      // Cek apakah user sudah join
      if (data.players.some(p => p.jid === sender)) {
        return await sock.sendMessage(remoteJid, { text: "❌ Kamu sudah bergabung di room!" }, { quoted: message });
      }
      
      // Tambah player baru
      data.players.push({
        jid: sender,
        name: `Pemain ${data.players.length + 1}`,
        money: 10000,
        position: 0,
        inJail: false
      });
      updateGame(remoteJid, data);
      
      return await sendMessageWithMention(
        sock, remoteJid, 
        `✅ @${sender.split("@")[0]} bergabung ke permainan!\nTotal Pemain: ${data.players.length}`, 
        message
      );
    }
  }

  // Cek validasi untuk command-command selanjutnya jika sesi tidak aktif
  if (!isUserPlaying(remoteJid)) return true;
  const data = getUser(remoteJid);

  // 2. Memulai Pertandingan (.mn start)
  if (commandText === ".mn start" || commandText === ".monopoli start") {
    if (data.creator !== sender) return false;
    if (data.players.length < 2) {
      return await sock.sendMessage(remoteJid, { text: "❌ Minimal butuh 2 pemain untuk memulai!" }, { quoted: message });
    }
    
    data.state = "PLAYING";
    data.currentTurn = 0;
    updateGame(remoteJid, data);
    
    const boardDisplay = renderBoardStatus(data) + `\n\nGame dimulai! Giliran pertama: @${data.players[0].jid.split("@")[0]}\nKetik *.k* untuk melempar dadu.`;
    await sendMessageWithMention(sock, remoteJid, boardDisplay, message);
    return false;
  }

  // 3. Command Melempar Dadu (.k atau .kocok)
  if (commandText === ".k" || commandText === ".kocok" || commandText === ".roll") {
    if (data.state !== "PLAYING") return false;
    
    const currentPlayer = data.players[data.currentTurn];
    if (currentPlayer.jid !== sender) {
      return await sendMessageWithMention(sock, remoteJid, `❌ Ini bukan giliranmu! Sekarang giliran @${currentPlayer.jid.split("@")[0]}`, message);
    }

    // Roll dadu (1-6)
    const dice = Math.floor(Math.random() * 6) + 1;
    let oldPos = currentPlayer.position;
    let newPos = (oldPos + dice) % BOARD_SIZE;
    
    currentPlayer.position = newPos;
    let infoAksi = `@${sender.split("@")[0]} mengocok dadu 🎲 dan mendapatkan angka *${dice}*.\n`;

    // Cek jika melewati START
    if (newPos < oldPos) {
      currentPlayer.money += 2000;
      infoAksi += `🎁 Melewati *START*, mendapat gaji $2000!\n`;
    }

    const tile = data.board[newPos];
    infoAksi += `Mendarat di petak *${tile.name}*.\n`;

    // Logika penanganan petak tanah/properti
    if (tile.type === "property") {
      if (!tile.owner) {
        infoAksi += `\nTanah ini belum ada pemiliknya. Kamu bisa membelinya seharga *$${tile.price}* dengan mengetik *.b* dalam giliran ini.`;
      } else if (tile.owner.jid !== sender) {
        currentPlayer.money -= tile.rent;
        tile.owner.money += tile.rent;
        infoAksi += `\n💸 Membayar sewa sebesar *$${tile.rent}* kepada @${tile.owner.jid.split("@")[0]}!`;
      }
    } else if (tile.type === "tax") {
      currentPlayer.money -= tile.penalty;
      infoAksi += `\n💥 Kena denda pajak sebesar *$${tile.penalty}*!`;
    }

    // Pindah giliran ke pemain berikutnya
    data.currentTurn = (data.currentTurn + 1) % data.players.length;
    updateGame(remoteJid, data);

    const boardDisplay = renderBoardStatus(data) + `\n\n${infoAksi}\n\nBerikutnya giliran: @${data.players[data.currentTurn].jid.split("@")[0]} (*.k*)`;
    await sendMessageWithMention(sock, remoteJid, boardDisplay, message);
    return false;
  }

  // 4. Command Beli Aset Tanah (.b atau .beli)
  if (commandText === ".b" || commandText === ".beli") {
    if (data.state !== "PLAYING") return false;
    
    // Karena giliran sudah berpindah di `.kocok`, kita cari pemain yang barusan jalan
    let lastTurn = (data.currentTurn - 1 + data.players.length) % data.players.length;
    const currentPlayer = data.players[lastTurn];
    
    if (currentPlayer.jid !== sender) {
      return await sock.sendMessage(remoteJid, { text: "❌ Kamu tidak bisa membeli sekarang!" }, { quoted: message });
    }

    const tile = data.board[currentPlayer.position];
    if (tile.type === "property" && !tile.owner) {
      if (currentPlayer.money < tile.price) {
        return await sock.sendMessage(remoteJid, { text: "❌ Uang kamu tidak cukup!" }, { quoted: message });
      }
      
      currentPlayer.money -= tile.price;
      tile.owner = { jid: currentPlayer.jid, name: currentPlayer.name };
      updateGame(remoteJid, data);
      
      await sendMessageWithMention(sock, remoteJid, `🎉 @${sender.split("@")[0]} berhasil membeli aset *${tile.name}* seharga $${tile.price}!`, message);
    }
    return false;
  }

  // 5. Menyerah / Membatalkan Game (.mn stop)
  if (commandText === ".mn stop" || commandText === ".mn nyerah" || commandText === ".monopoli stop" || commandText === ".monopoli nyerah") {
    removeUser(remoteJid);
    await sock.sendMessage(remoteJid, { text: "🏳️ Game Monopoli dihentikan dan room dihapus." }, { quoted: message });
    return false;
  }

  return true;
}

export default {
  handle,
  Commands: ["monopoli", "mn", "kocok", "k", "roll", "beli", "b"], // ← Daftarkan singkatan pendek di sini
  OnlyPremium: false,
  OnlyOwner: false,
};