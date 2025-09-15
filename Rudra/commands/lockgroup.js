// === modules/commands/lockgroup.js ===
const fs = require("fs");
const path = require("path");

// Path to JSON file
const DATA_FILE = path.join(__dirname, "lockgroup.json");

// Load data
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

// Save data
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "lockgroup",
  version: "2.0.1",
  role: 1,
  author: "ChatGPT",
  cooldowns: 5,
  description: "Lock group name (per GC)",
  usages: "/lockgroup name | /lockgroup remove"
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const data = loadData();

  if (!args[0]) {
    return api.sendMessage("❗ Usage: /lockgroup name | remove", threadID, messageID);
  }

  if (args[0] === "name") {
    const info = await api.getThreadInfo(threadID);
    data[threadID] = { name: info.threadName };
    saveData(data);
    return api.sendMessage(
      `🔒 Group name is now locked to: "${info.threadName}"`,
      threadID,
      messageID
    );
  }

  if (args[0] === "remove") {
    delete data[threadID];
    saveData(data);
    return api.sendMessage("🔓 Group name lock removed.", threadID, messageID);
  }

  return api.sendMessage("❌ Invalid option. Use: name | remove", threadID, messageID);
};

// === Auto enforce lock ===
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID } = event;
  if (!threadID) return;

  const data = loadData();
  const record = data[threadID];
  if (!record || !record.name) return;

  const info = await api.getThreadInfo(threadID);
  if (info.threadName !== record.name) {
    try {
      await api.setTitle(record.name, threadID);
      api.sendMessage(`⚠️ Group name is locked to: "${record.name}"`, threadID);
    } catch (e) {
      console.error("LockGroup error:", e);
    }
  }
};
