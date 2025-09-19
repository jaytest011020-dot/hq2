module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "1.2.4",
  credits: "Kim Joseph DG Bien (updated by ChatGPT)",
  description: "Join Notification with API-generated welcome photo",
  dependencies: {
    "fs-extra": "",
    "request": ""
  }
};

module.exports.run = async function ({ api, event }) {
  const request = require("request");
  const fs = global.nodemodule["fs-extra"];
  const path = require("path");

  const { threadID, logMessageData } = event;
  const addedParticipants = logMessageData.addedParticipants;

  // ✅ If bot was added, set nickname only (no message)
  if (addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
    return api.changeNickname(
      `𝗕𝗢𝗧 ${global.config.BOTNAME} 【 ${global.config.PREFIX} 】`,
      threadID,
      api.getCurrentUserID()
    );
  }

  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const threadName = threadInfo.threadName || "this group";
    const totalMembers = threadInfo.participantIDs?.length || 0;

    for (let newParticipant of addedParticipants) {
      const userID = newParticipant.userFbId;
      if (userID === api.getCurrentUserID()) continue;

      let userName = "Friend";
      try {
        const userInfo = await api.getUserInfo(userID);
        if (userInfo?.[userID]?.name) userName = userInfo[userID].name;
      } catch (e) {
        console.warn("⚠️ Failed to get user info:", e.message);
      }

      const msg = `Hello ${userName}!\nWelcome to ${threadName}!\nYou're the ${totalMembers}th member in this group, please enjoy!`;

      const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/welcome?name=${encodeURIComponent(userName)}&userid=${userID}&threadname=${encodeURIComponent(threadName)}&members=${totalMembers}`;

      const filePath = path.join(__dirname, "..", "commands", "cache", `welcome_${userID}.png`);
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      const callback = () => {
        if (fs.existsSync(filePath)) {
          api.sendMessage({
            body: msg,
            attachment: fs.createReadStream(filePath),
            mentions: [{ tag: userName, id: userID }]
          }, threadID, () => fs.unlinkSync(filePath));
        } else {
          api.sendMessage(msg, threadID);
        }
      };

      console.log(`📥 Generating welcome for ${userName} (${userID})`);
      request(apiUrl)
        .pipe(fs.createWriteStream(filePath))
        .on("close", callback)
        .on("error", (err) => {
          console.error("❌ Error downloading welcome image:", err.message);
          api.sendMessage(msg, threadID);
        });
    }
  } catch (err) {
    console.error("❌ ERROR in joinNoti module:", err);
  }
};
