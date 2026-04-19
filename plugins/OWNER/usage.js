import { getProcessUsage, getServerSpecs } from "../../lib/startup.js";

async function handle(sock, messageInfo) {
  const { remoteJid, message } = messageInfo;

  try {
    const nodeUsage = getProcessUsage();
    const server = await getServerSpecs();

    const text = `📊 *NODE JS MEMORY USAGE* 📊

*Process Usage:*
◧ RSS: ${nodeUsage.rss}
◧ Heap Used: ${nodeUsage.heapUsed}
◧ Heap Total: ${nodeUsage.heapTotal}
◧ External: ${nodeUsage.external}

*System Info:*
◧ Free RAM: ${server.freeMemory} / ${server.totalMemory}
◧ Uptime: ${server.uptime}

_Note: Heap Used adalah penggunaan RAM asli aplikasi bot kamu saat ini._`;

    await sock.sendMessage(remoteJid, { text }, { quoted: message });
  } catch (error) {
    console.error(error);
    await sock.sendMessage(remoteJid, { text: "❌ Gagal mengambil data penggunaan memori." });
  }
}

export default {
  handle,
  Commands: ["usage", "statusram"],
  OnlyPremium: false,
  OnlyOwner: true,
};
