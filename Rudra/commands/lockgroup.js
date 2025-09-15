// === modules/commands/lockname.js ===
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "lockname.json");

// Load saved locked names
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

// Save locked names
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "lockname",
  version: "1.1.0",
  role: 1,
  author: "ChatGPT",
  cooldowns: 5,
  description: "Lock the group name and auto-revert if someone changes it",
  usages: "/lockname <group name> | /lockname remove"
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const data = loadData();

  if (!args[0]) {
    return api.sendMessage("❗ Usage: /lockname <group name> | remove", threadID, messageID);
  }

  if (args[0] === "remove") {
    delete data[threadID];
    saveData(data);
    return api.sendMessage("🔓 Group name lock removed.", threadID, messageID);
  }

  // Join args into full name (handles spaces)
  const newName = args.join(" ");
  data[threadID] = { name: newName };
  saveData(data);

  return api.sendMessage(`🔒 Group name is now locked to: "${newName}"`, threadID, messageID);
};

// === Auto enforce lock ===
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, logMessageType, logMessageData, author } = event;
  if (logMessageType !== "log:thread-name") return; // only detect name change

  const data = loadData();
  const record = data[threadID];
  if (!record || !record.name) return;

  const info = await api.getThreadInfo(threadID);
  const newName = logMessageData?.name || info.threadName;

  if (newName !== record.name) {
    // Get changer's name
    let changerName = author;
    try {
      changerName = info.userInfo.find(u => String(u.id) === String(author))?.name || author;
    } catch {}

    try {
      await api.setTitle(record.name, threadID);
      api.sendMessage(
        `⚠️ ${changerName} tried to change the group name to: "${newName}"\n` +
        `🔒 Reverted back to locked name: "${record.name}"`,
        threadID
      );
    } catch (e) {
      console.error("LockName error:", e);
    }
  }
};
