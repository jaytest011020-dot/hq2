// === modules/commands/lockgroup.js ===
const fs = require("fs");
const path = require("path");

// JSON file path
const filePath = path.join(__dirname, "lockgroups.json");

// Load saved data or create empty file kung wala pa
function loadLocks() {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } else {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2), "utf8");
      return {};
    }
  } catch (e) {
    console.error("Failed to load lockgroups.json:", e);
    return {};
  }
}

// Save data to file
function saveLocks(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save lockgroups.json:", e);
  }
}

// Global cache (once only)
if (!global.lockGroups) global.lockGroups = loadLocks();

module.exports.config = {
  name: "lockgroup",
  version: "3.0.1",
  role: 1,
  author: "ChatGPT",
  cooldowns: 5,
  description: "Lock group name (per GC, saved in JSON)",
  usages: "/lockgroup name | /lockgroup remove"
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (!args[0]) {
    return api.sendMessage("❗ Usage: /lockgroup name | remove", threadID, messageID);
  }

  if (args[0].toLowerCase() === "name") {
    try {
      const info = await api.getThreadInfo(threadID);
      global.lockGroups[threadID] = info.threadName;
      saveLocks(global.lockGroups);

      return api.sendMessage(
        `🔒 Group name is now locked to: "${info.threadName}"`,
        threadID,
        messageID
      );
    } catch (e) {
      console.error("lockgroup name error:", e);
      return api.sendMessage("⚠️ Failed to lock group name.", threadID, messageID);
    }
  }

  if (args[0].toLowerCase() === "remove") {
    delete global.lockGroups[threadID];
    saveLocks(global.lockGroups);

    return api.sendMessage("🔓 Group name lock removed.", threadID, messageID);
  }

  return api.sendMessage("❌ Invalid option. Use: name | remove", threadID, messageID);
};

// === Auto enforce lock ===
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID } = event;
  if (!threadID) return;

  const lockedName = global.lockGroups[threadID];
  if (!lockedName) return;

  try {
    const info = await api.getThreadInfo(threadID);
    if (info.threadName !== lockedName) {
      await api.setTitle(lockedName, threadID);
      api.sendMessage(`⚠️ Group name is locked to: "${lockedName}"`, threadID);
    }
  } catch (e) {
    console.error("LockGroup enforce error:", e);
  }
};
