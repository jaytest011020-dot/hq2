const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "autobanJoin",
  eventType: ["log:subscribe"],
  version: "1.0.0",
  credits: "ChatGPT",
  description: "Auto kick banned users when they join"
};

const banFile = path.join(__dirname, "banList.json");

module.exports.run = async function ({ api, event }) {
  if (!fs.existsSync(banFile)) fs.writeFileSync(banFile, JSON.stringify([]));
  const bans = JSON.parse(fs.readFileSync(banFile));

  const { threadID, logMessageData } = event;
  const addedParticipants = logMessageData.addedParticipants;

  for (const member of addedParticipants) {
    const userID = member.userFbId;

    const banned = bans.find(b => b.uid === userID);
    if (banned) {
      try {
        const info = await api.getUserInfo(userID);
        const name = info?.[userID]?.name || "User";

        api.removeUserFromGroup(userID, threadID, err => {
          if (!err) {
            api.sendMessage(
              `❌ ${name} has been auto-removed!\n📄 Reason: ${banned.reason}`,
              threadID
            );
          } else {
            api.sendMessage(
              `⚠️ Failed to remove ${name}. Reason: ${banned.reason}`,
              threadID
            );
          }
        });
      } catch (err) {
        console.error("AutoBan Error:", err.message);
      }
    }
  }
};
