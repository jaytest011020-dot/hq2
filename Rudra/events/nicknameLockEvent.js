const fs = require("fs-extra");
const path = require("path");

const NICKNAME_LOCK_FILE = path.join(__dirname, "../data/locked_nicknames.json");

// Function to load locked nickname data
function loadLockedNicknames() {
    try {
        if (fs.existsSync(NICKNAME_LOCK_FILE)) {
            return JSON.parse(fs.readFileSync(NICKNAME_LOCK_FILE, "utf8"));
        }
    } catch (error) {
        console.error("Error loading locked nicknames in event:", error);
    }
    return {};
}

module.exports.config = {
  name: "nicknameLockEvent",
  eventType: ["log:thread-nickname"], // Listens to nickname change events
  version: "1.1",
  credits: "Rudra x ChatGPT"
};

module.exports.run = async function({ event, api }) {
  const { threadID, logMessageData } = event;

  // Load locked nickname data directly from JSON file
  const lockedNicknamesData = loadLockedNicknames();

  // If nickname lock is not enabled for this thread, stop here
  if (!lockedNicknamesData[threadID]) return;

  const changedUserID = logMessageData.participant_id;
  const newNickname = logMessageData.nickname;

  // Ignore if the bot itself changed the nickname (to prevent infinite loop)
  if (changedUserID === api.getCurrentUserID()) {
    return;
  }

  // Get the originally locked nickname for this user
  const originalLockedNick = lockedNicknamesData[threadID][changedUserID];

  // If the new nickname is different from the locked nickname
  if (typeof originalLockedNick !== 'undefined' && newNickname !== originalLockedNick) {
    try {
      // Reset nickname back to locked value
      await api.changeNickname(originalLockedNick, threadID, changedUserID);

      // Send warning message to user
      api.sendMessage(
        `⚠️ @${changedUserID}, your nickname is locked. It has been reset to "${originalLockedNick || "blank"}". Please don’t try to change it.`,
        threadID,
        (err) => { 
          if (err) console.error("Error sending mention message:", err);
        },
        [changedUserID] // Mention the user who tried to change nickname
      );
    } catch (err) {
      console.error(`Error resetting nickname for user ${changedUserID} in thread ${threadID}:`, err);
      // If something goes seriously wrong, you could notify the bot owner here
    }
  }
};
