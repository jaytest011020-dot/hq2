const fs = require("fs");
const path = require("path");

// Paths
const dataFile = path.join(__dirname, "scamlist.json");
const backupDir = path.join(__dirname, "scamlist_backups");

// Ensure scamlist.json exists
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({ scammers: [] }, null, 2), "utf8");
}

// Ensure backup folder exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
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

// 🔹 Auto-save every 1 minute
setInterval(() => {
  const data = loadScamList();
  saveScamList(data);
}, 60 * 1000);

// 🔹 Auto-backup every 5 minutes
setInterval(() => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `scamlist_backup_${timestamp}.json`);
  try {
    fs.copyFileSync(dataFile, backupFile);
    console.log(`[Scamlist Backup] Saved to ${backupFile}`);
  } catch (e) {
    console.error("[Scamlist Backup Error]", e);
  }
}, 5 * 60 * 1000);

module.exports.config = {
  name: "scamlist",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Show scammer list & auto scam detection",
  commandCategory: "Safety",
  usages: "/scamlist",
  cooldowns: 5,
};

// 🔹 Auto detect scam messages
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

// 🔹 Run command (/scamlist)
module.exports.run = function ({ api, event }) {
  const scamData = loadScamList();
  if (scamData.scammers.length === 0) {
    return api.sendMessage("✅ Scam list is empty.", event.threadID);
  }
  let msg = "⚠️ Scam List:\n";
  scamData.scammers.forEach((s, i) => {
    msg += `\n${i + 1}. ${s.name} - ${s.link}`;
  });
  api.sendMessage(msg, event.threadID);
};
