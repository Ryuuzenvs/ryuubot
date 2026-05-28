import { findUser, updateUser } from "../../lib/users.js";

import { sendMessageWithMention, convertToJid } from "../../lib/utils.js";

async function handle(sock, messageInfo) {

  const { remoteJid, message, content, prefix, command, senderType } = messageInfo;

  if (!content?.trim()) {

    return sock.sendMessage(remoteJid, { text: `_Format: *${prefix + command} @tag 30*_` }, { quoted: message });

  }

  const [rawNumber, rawLimit] = content.split(" ").map((s) => s.trim());

  const limitToAdd = parseInt(rawLimit, 10);

  if (isNaN(limitToAdd) || limitToAdd <= 0) return;

  let userJid = rawNumber.includes('@') ? rawNumber.replace(/[@ ]/g, '') + '@s.whatsapp.net' : rawNumber;

  let dataUsers = await findUser(userJid);

  if (!dataUsers) {

     const r = await convertToJid(sock, rawNumber);

     userJid = r;

     dataUsers = await findUser(r);

  }

  if (dataUsers) {

    const [docId, userData] = dataUsers;

    // Tambahkan ke field paidLimit

    await updateUser(userJid, {

      paidLimit: (userData.paidLimit || 0) + limitToAdd,

    });

    await sendMessageWithMention(

      sock,

      remoteJid,

      `✅ _Berhasil menambah *${limitToAdd}* Paid Limit ke user._`,

      message,

      senderType

    );

  }

}

export default {

  handle,

  Commands: ["addpaidlimit"],

  OnlyOwner: true,

};
