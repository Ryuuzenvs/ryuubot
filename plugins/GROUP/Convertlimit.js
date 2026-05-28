import { findUser, updateUser } from "../../lib/users.js";

async function handle(sock, messageInfo) {

  const { remoteJid, message, content, sender, prefix, command } = messageInfo;

  const amount = parseInt(content?.trim(), 10);

  if (!amount || amount <= 0) {

    return await sock.sendMessage(remoteJid, { 

      text: `_Masukkan jumlah yang ingin diconvert._\n_Contoh: *${prefix + command} 10*_` 

    }, { quoted: message });

  }

  const dataUsers = await findUser(sender);

  if (!dataUsers) return;

  const [docId, userData] = dataUsers;

  const currentPaidLimit = userData.paidLimit || 0;

  if (currentPaidLimit < amount) {

    return await sock.sendMessage(remoteJid, { 

      text: `❌ _Paid Limit Anda tidak cukup._\n_Saldo Paid Limit: *${currentPaidLimit}*_` 

    }, { quoted: message });

  }

  // Eksekusi pemindahan saldo

  await updateUser(sender, {

    paidLimit: currentPaidLimit - amount,

    limit: (userData.limit || 0) + amount

  });

  return await sock.sendMessage(remoteJid, {

    text: `✅ _Berhasil convert *${amount}* Paid Limit ke Limit biasa._\n\n_Sisa Paid Limit: *${currentPaidLimit - amount}*_`

  }, { quoted: message });

}

export default {

  handle,

  Commands: ["convertlimit", "claimpaid"],

};