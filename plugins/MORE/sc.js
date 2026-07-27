import { reply } from "../../lib/utils.js";
import config from "../../config.js";

async function handle(sock, messageInfo) {
  const { m } = messageInfo;

  const text = `╭「 𝙎𝘾𝙍𝙄𝙋𝙏 _RyuuBotWa_ 」
│
│◧ ᴠᴇʀꜱɪᴏɴ : ${global.version}
│◧ ᴛʏᴘᴇ ᴘʟᴜɢɪɴꜱ ᴇꜱᴍ
│◧ ɴᴏ ᴇɴᴄ 100%
│◧ ɴᴏ ʙᴜɢ & ɴᴏ ᴇʀʀᴏʀ 
│◧ ʜᴀʀɢᴀ ? pm 6285188510933
│◧ ʙɪꜱᴀ ʀᴜɴ ᴅɪ ᴘᴀɴᴇʟ
╰────────────────────────◧`;

  await reply(m, text);
}

export default {
  handle,
  Commands: ["sc", "script"],
  OnlyPremium: false,
  OnlyOwner: false,
};
