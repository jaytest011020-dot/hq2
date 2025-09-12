module.exports.config = {
  name: "scamlist",
  version: "1.3.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Show fixed scammer list & auto scam detection",
  commandCategory: "Safety",
  usages: "/scamlist",
  cooldowns: 5,
};

// 🔹 Static scammer list
const scammers = [
  { name: "YukieLopez", link: "https://www.facebook.com/share/1CYqPEycKp/" },
  { name: "ChristianExhibit", link: "https://www.facebook.com/share/179vDnMfmH/" },
  { name: "ClentJohnTulalian", link: "https://www.facebook.com/share/1E3znHcf8d/" },
  { name: "MitsuGt", link: "https://www.facebook.com/share/19syFSNmqU/" }
];

// 🔹 Format scamlist message
function formatScamList() {
  let msg = `⚠️ Scammer List (Total: ${scammers.length}) ⚠️\n`;
  scammers.forEach((s, i) => {
    msg += `\n${i + 1}. ${s.name}\n🔗 ${s.link}\n`;
  });
  return msg.trim();
}

// 🔹 Auto detect scam messages
module.exports.handleEvent = function ({ event, api }) {
  const msg = event.body?.toLowerCase() || "";
  if (msg.includes("scam") || msg.includes("scammer")) {
    api.sendMessage(formatScamList(), event.threadID, event.messageID);
  }
};

// 🔹 Run command (/scamlist)
module.exports.run = function ({ api, event }) {
  api.sendMessage(formatScamList(), event.threadID);
};
