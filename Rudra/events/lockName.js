// === events/adminupdate.js ===
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../modules/commands/lockname.json");

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

module.exports = {
  config: {
    name: "lockName", // The name of the event
    eventType: ["log:thread-name"], // This listens for thread name changes
    version: "1.0.0",
    credits: "ChatGPT",
    description: "Auto-revert group name change to a locked name if someone tries to change it",
  },

  // Event handler to auto-revert name change
  run: async function ({ api, event }) {
    const { threadID, logMessageType, logMessageData, author } = event;

    // Only listen for thread name changes
    if (logMessageType !== "log:thread-name") return;

    const data = loadData();
    if (!data[threadID]) return; // No locked name data for this thread

    const lockedName = data[threadID].name;
    const newName = logMessageData?.name || "";

    if (newName !== lockedName) {
      try {
        // Revert the group name back to the locked name
        await api.setTitle(lockedName, threadID);

        // Get the name of the person who tried to change it
        const userInfo = await api.getUserInfo(author);
        const changerName = userInfo[author]?.name || author;

        // Notify the group about the name change attempt and revert
        api.sendMessage(
          `⚠️ ${changerName} tried to change the group name to "${newName}".\n` +
          `🔒 Reverted back to locked name: "${lockedName}"`,
          threadID
        );
      } catch (err) {
        console.error("❌ Error reverting group name:", err.message);
      }
    }
  }
};
