import { reply } from "../../lib/utils.js";
import { addOwner } from "../../lib/users.js";

async function handle(sock, messageInfo) {
  const { m, prefix, command, content } = messageInfo;

  if (!content || !content.trim()) {
    return await reply(
      m,
      `_Masukkan format yang valid_\n\n` +
      `Opsi Hari: _${prefix + command} 628xxx 30_\n` +
      `Opsi Permanen: _${prefix + command} 628xxx permanen_ atau cukup _${prefix + command} 628xxx_`
    );
  }

  const args = content.trim().split(/\s+/);
  const rawNumber = args[0];
  const durationArg = args[1] ? args[1].toLowerCase() : "permanen";

  const ownerNumber = rawNumber.replace(/\D/g, "");

  if (!/^\d{10,15}$/.test(ownerNumber)) {
    return await reply(
      m,
      `_Nomor tidak valid. Pastikan digitnya benar (10-15 digit)._`
    );
  }

  let durationParam = "PERMANENT";
  let responseText = `_Nomor ${ownerNumber} berhasil ditambahkan sebagai Owner secara *Permanen*._`;

  if (durationArg !== "permanen" && durationArg !== "permanent") {
    if (isNaN(durationArg) || parseInt(durationArg) <= 0) {
      return await reply(m, `_Format hari salah! Masukkan angka jumlah hari yang valid (Contoh: 30)._`);
    }
    durationParam = durationArg;
    responseText = `_Nomor ${ownerNumber} berhasil ditambahkan sebagai Owner selama *${durationArg} Hari*._`;
  }

  try {
    addOwner(ownerNumber, durationParam);
    return await reply(m, responseText);
  } catch (error) {
    console.error("Error saat menambahkan owner:", error);
    return await reply(m, `_Terjadi kesalahan saat memproses permintaan._`);
  }
}

export default {
  handle,
  Commands: ["addowner"],
  OnlyPremium: false,
  OnlyOwner: true,
};
