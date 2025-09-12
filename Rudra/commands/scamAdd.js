const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "scamlist.json");
const backupDir = path.join(__dirname, "scamlist_backups");

// Ensure backup folder exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Load scamlist
let scamData = { scammers: [] };
if (fs.existsSync(dataFile)) {
  try {
    scamData = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    scamData = { scammers: [] };
  }
} else {
  fs.writeFileSync(dataFile, JSON.stringify(scamData, null, 2), "utf8");
}

// Save scamlist
function saveScamList() {
  fs.writeFileSync(dataFile, JSON.stringify(scamData, null, 2), "utf8");
}

// 🔹 Auto-save every 1 minute
setInterval(saveScamList, 60 * 1000);

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
  name: "scamadd",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Add scammer to scamlist (persistent)",
  commandCategory: "Safety",
  usages: "/scamadd <name> <fb link>",
  cooldowns: 5,
};

module.exports.run = function ({ api, event, args }) {
  if (args.length < 2) {
    return api.sendMessage("❌ Usage: /scamadd <name> <fb link>", event.threadID);
  }

  const name = args.slice(0, -1).join(" ");
  const link = args[args.length - 1];

  scamData.scammers.push({ name, link });
  saveScamList();

  api.sendMessage(`✅ Added scammer:\n${name} - ${link}`, event.threadID);
};
