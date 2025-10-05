const { db } = require("../../database.js");

module.exports.config = {
  name: "autobanJoin",
  eventType: ["log:subscribe"],
  version: "2.0.0",
  credits: "ChatGPT",
  description: "Auto kick banned users per GC using Firebase"
};

module.exports.run = async function({ api, event }) {
  const { threadID, logMessageData } = event;
  const addedParticipants = logMessageData.addedParticipants || [];

  for (const member of addedParticipants) {
    const userID = member.userFbId;
    const ref = db.ref(`bans/${threadID}/${userID}`);
    const snapshot = await ref.get();

    if (snapshot.exists()) {
      const banData = snapshot.val();
      try {
        const info = await api.getUserInfo(userID);
        const name = info?.[userID]?.name || "User";

        api.removeUserFromGroup(userID, threadID, err => {
          if (!err) {
            api.sendMessage(
              `❌ ${name} has been auto-removed!\n📄 Reason: ${banData.reason}`,
              threadID
            );
          } else {
            api.sendMessage(
              `⚠️ Failed to remove ${name}. Reason: ${banData.reason}`,
              threadID
            );
          }
        });
      } catch (err) {
        console.error("AutoBan Firebase Error:", err.message);
      }
    }
  }
};
