const fs = require("fs");
const path = require("path");
const scamFile = path.join(__dirname, "scammers.json");

function loadScammers() {
  if (!fs.existsSync(scamFile)) {
    fs.writeFileSync(scamFile, JSON.stringify({ scammers: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(scamFile));
}

function buildScammerList(list) {
  if (list.length === 0) return "✅ Walang laman ang scammer list.";
  let msg = `⚠️ Scammer List (Total: ${list.length}) ⚠️\n\n`;
  list.forEach((item, i) => {
    msg += `${i + 1}. ${item.name}\n🔗 ${item.fb}\n\n`;
  });
  return msg.trim();
}

module.exports.config = {
  name: "scam",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "YourName",
  description: "Check scammer list",
  commandCategory: "system",
  usages: "/scam",
  cooldowns: 3
};

module.exports.run = async function({ api, event }) {
  const data = loadScammers();
  const msg = buildScammerList(data.scammers);
  api.sendMessage(msg, event.threadID, event.messageID);
};
