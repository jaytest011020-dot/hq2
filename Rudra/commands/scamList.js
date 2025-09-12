const fs = require("fs");
const path = require("path");

// Path to JSON file
const dataFile = path.join(__dirname, "scamlist.json");

// Ensure file exists
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({ scammers: [] }, null, 2), "utf8");
}

// Load scammers
function loadScamList() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch (e) {
    return { scammers: [] };
  }
}

// Save scammers
function saveScamList(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

// Auto-save every 1 minute
setInterval(() => {
  const data = loadScamList();
  saveScamList(data);
}, 60 * 1000);

module.exports.config = {
  name: "scam",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Scam detection & scamlist storage",
  commandCategory: "Safety",
  usages: "scam list",
  cooldowns: 5,
};

// Detect scam messages without prefix
module.exports.handleEvent = function ({ event, api }) {
  const msg = event.body?.toLowerCase() || "";
  if (msg.includes("scam") || msg.includes("scammer")) {
    const scamData = loadScamList();
    if (scamData.scammers.length === 0) return;
    let reply = "⚠️ Scam List:\n";
    scamData.scammers.forEach((s, i) => {
      reply += `\n${i + 1}. ${s.name} - ${s.link}`;
    });
    api.sendMessage(reply, event.threadID, event.messageID);
  }
};

// Run command (only list here, add/remove are in separate modules)
module.exports.run = function ({ api, event, args }) {
  const scamData = loadScamList();
  if (args[0] && args[0].toLowerCase() === "list") {
    if (scamData.scammers.length === 0) {
      return api.sendMessage("✅ Scam list is empty.", event.threadID);
    }
    let msg = "⚠️ Scam List:\n";
    scamData.scammers.forEach((s, i) => {
      msg += `\n${i + 1}. ${s.name} - ${s.link}`;
    });
    api.sendMessage(msg, event.threadID);
  } else {
    api.sendMessage("Use: /scam list", event.threadID);
  }
};
