const fs = require("fs");
const path = require("path");
const scamFile = path.join(__dirname, "scammers.json");

// Load list
function loadScammers() {
  if (!fs.existsSync(scamFile)) {
    fs.writeFileSync(scamFile, JSON.stringify({ scammers: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(scamFile));
}

// Format list
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
  description: "Auto-detect scam keyword or manual /scam command",
  commandCategory: "system",
  usages: "/scam",
  cooldowns: 0
};

// 🔹 Auto-trigger kahit walang prefix
module.exports.handleEvent = function({ api, event }) {
  if (!event.body) return;

  const text = event.body.toLowerCase();
  if (text.includes("scam")) {
    const data = loadScammers();
    api.sendMessage(buildScammerList(data.scammers), event.threadID, event.messageID);
  }
};

// 🔹 Manual /scam command
module.exports.run = async function({ api, event }) {
  const data = loadScammers();
  api.sendMessage(buildScammerList(data.scammers), event.threadID, event.messageID);
};
