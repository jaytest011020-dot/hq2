const { getData } = require("../../database.js");

module.exports.config = {
  name: "autoKickBan",
  eventType: ["log:subscribe"],
  version: "1.1.0",
  credits: "Jaylord La Peña + ChatGPT",
  description: "Auto-kick banned users if they join the group"
};

module.exports.run = async function ({ api, event }) {
  const { threadID, logMessageData } = event;
  const addedParticipants = logMessageData.addedParticipants;

  try {
    // 🔍 Kunin bans ng GC
    const bans = await getData(`bans/${threadID}`) || {};

    for (const user of addedParticipants) {
      const userID = user.userFbId;

      // 🚫 Check kung banned
      if (bans[userID]) {
        const reason = bans[userID].reason || "No reason specified";

        try {
          await api.removeUserFromGroup(userID, threadID);
          api.sendMessage(
            `⚠️ User ${userID} tried to join but is banned!\n📄 Reason: ${reason}`,
            threadID
          );
        } catch (err) {
          api.sendMessage(
            `❌ Failed to auto-kick banned user ${userID}. Bot might not have admin rights.`,
            threadID
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ AutoKickBan Error:", err);
  }
};
