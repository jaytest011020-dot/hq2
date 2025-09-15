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
  version: "1.3.0",
  hasPermssion: 1, // ✅ correct spelling
  credits: "ChatGPT",
  cooldowns: 5,
  description: "Lock the group name and auto-revert if someone changes it",
  usages: "/lockname [group name] | /lockname remove",
  commandCategory: "group"
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const data = loadData();

  // remove lock
  if (args[0] && args[0].toLowerCase() === "remove") {
    delete data[threadID];
    saveData(data);
    return api.sendMessage("🔓 Group name lock removed.", threadID, messageID);
  }

  // get current group name kung walang args
  let newName;
  if (!args[0]) {
    try {
      const info = await api.getThreadInfo(threadID);
      newName = info.threadName || "Unnamed Group";
    } catch {
      return api.sendMessage("⚠️ Failed to fetch current group name.", threadID, messageID);
    }
  } else {
    newName = args.join(" ");
  }

  data[threadID] = { name: newName };
  saveData(data);

  return api.sendMessage(`🔒 Group name is now locked to: "${newName}"`, threadID, messageID);
};

// === Auto enforce lock ===
module.exports.handleEvent = async function ({ api, event }) {
  try {
    if (event.logMessageType !== "log:thread-name") return;

    const { threadID, logMessageData, author } = event;
    const data = loadData();
    const record = data[threadID];
    if (!record || !record.name) return;

    const newName = logMessageData?.name;
    if (!newName || newName === record.name) return;

    // Fetch thread info para makuha pangalan ng nag-change
    let changerName = author;
    try {
      const info = await api.getThreadInfo(threadID);
      const found = info.userInfo.find(u => String(u.id) === String(author));
      if (found) changerName = found.name;
    } catch (err) {
      console.error("⚠️ Could not fetch changer name:", err.message);
    }

    // Revert back to locked name
    try {
      await api.setTitle(record.name, threadID);
      api.sendMessage(
        `⚠️ ${changerName} tried to change the group name to: "${newName}"\n` +
        `🔒 Reverted back to locked name: "${record.name}"`,
        threadID
      );
    } catch (err) {
      console.error("❌ LockName revert error:", err.message);
    }
  } catch (err) {
    console.error("❌ LockName handleEvent fatal:", err);
  }
};
