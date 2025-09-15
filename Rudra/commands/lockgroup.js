// === modules/commands/lockname.js ===
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "lockname.json");

// Load & save helpers
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "lockname",
  version: "1.3.0",
  hasPermssion: 0, // Anyone can call the command, but we check inside
  credits: "ChatGPT",
  cooldowns: 5,
  description: "Lock the group name and auto-revert if someone changes it",
  usages: "/lockname <group name> | /lockname remove",
  commandCategory: "group"
};

// === Command ===
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  const botAdmins = global.config.ADMINBOT || [];
  const isBotOwner = botAdmins.includes(senderID);

  let isGroupAdmin = false;
  try {
    const info = await api.getThreadInfo(threadID);
    isGroupAdmin = info.adminIDs.some(e => e.id == senderID);
  } catch (err) {
    console.error("⚠️ Error fetching group info:", err.message);
  }

  if (!isBotOwner && !isGroupAdmin) {
    return api.sendMessage("⚠️ You do not have permission to use this command.", threadID, messageID);
  }

  const data = loadData();

  if (!args[0]) {
    return api.sendMessage("❗ Usage: /lockname <group name> | /lockname remove", threadID, messageID);
  }

  if (args[0].toLowerCase() === "remove") {
    delete data[threadID];
    saveData(data);
    return api.sendMessage("🔓 Group name lock removed.", threadID, messageID);
  }

  const newName = args.join(" ");
  data[threadID] = { name: newName };
  saveData(data);

  return api.sendMessage(`🔒 Group name is now locked to: "${newName}"`, threadID, messageID);
};
