const { db } = require("../../database.js");

module.exports.config = {
  name: "autoKickBan",
  eventType: ["log:subscribe"],
  version: "1.0.0",
  credits: "ChatGPT",
  description: "Auto-kick banned users if they join the group"
};

module.exports.run = async function ({ api, event }) {
  const { threadID, logMessageData } = event;
  const addedParticipants = logMessageData.addedParticipants;

  try {
    for (const user of addedParticipants) {
      const userID = user.userFbId;
      const ref = db.ref(`bans/${threadID}/${userID}`);
      const snapshot = await ref.get();

      // 🚫 Check if banned
      if (snapshot.exists()) {
        const data = snapshot.val();
        const reason = data.reason || "No reason specified";

        // 🦶 Kick user
        await api.removeUserFromGroup(userID, threadID);

        // 🗣️ Send notification
        api.sendMessage(
          `⚠️ User ${userID} tried to join but is banned!\n📄 Reason: ${reason}`,
          threadID
        );
      }
    }
  } catch (err) {
    console.error("❌ AutoKickBan Error:", err);
  }
};
