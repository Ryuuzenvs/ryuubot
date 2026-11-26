export const BOARD_SIZE = 8;

export const MAP_EMOJIS = {
  0: "🟩", // Start
  1: "🏙️", // Jakarta
  2: "💥", // Pajak
  3: "🏙️", // Bali
  4: "🔒", // Penjara
  5: "🏙️", // Jogja
  6: "🎁", // Kesempatan
  7: "🏙️", // Bandung
};

export function createMonopoliGame(creatorJid, creatorName) {
  return {
    state: "WAITING", // WAITING, PLAYING
    creator: creatorJid,
    currentTurn: 0,
    players: [
      {
        jid: creatorJid,
        name: creatorName,
        money: 10000,
        position: 0,
        inJail: false,
      }
    ],
    board: [
      { name: "START", type: "start", bonus: 2000 },
      { name: "Jakarta", type: "property", price: 1000, rent: 200, owner: null },
      { name: "Bayar Pajak", type: "tax", penalty: 500 },
      { name: "Bali", type: "property", price: 1200, rent: 250, owner: null },
      { name: "Penjara", type: "jail" },
      { name: "Yogyakarta", type: "property", price: 1500, rent: 350, owner: null },
      { name: "Kesempatan", type: "chance" },
      { name: "Bandung", type: "property", price: 1800, rent: 400, owner: null }
    ]
  };
}

export function renderBoardStatus(session) {
  let text = `*🎲 MONOPOLI BOARD 🎲*\n`;
  text += `=========================\n`;
  
  session.board.forEach((tile, index) => {
    let emoji = MAP_EMOJIS[index] || "⬜";
    let playerHere = session.players
      .map((p, i) => (p.position === index ? `P${i+1}` : ""))
      .filter(Boolean)
      .join(", ");
      
    let ownerText = tile.owner ? `(Milik ${tile.owner.name})` : "";
    let info = playerHere ? `👈 *[${playerHere}]*` : "";
    
    text += `${emoji} ${index}. *${tile.name}* ${ownerText} ${info}\n`;
  });
  
  text += `=========================\n`;
  session.players.forEach((p, i) => {
    text += `*P${i+1}* - @${p.jid.split("@")[0]} | Uang: $${p.money}\n`;
  });
  
  return text.trim();
}