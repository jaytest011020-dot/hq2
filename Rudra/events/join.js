module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "1.2.3",
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

  // ✅ If bot was added
  if (addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
    api.changeNickname(
      `𝗕𝗢𝗧 ${global.config.BOTNAME} 【 ${global.config.PREFIX} 】`,
      threadID,
      api.getCurrentUserID()
    );
    return api.sendMessage(
      `BOT CONNECTED!!\n\nThank you for using my BOT\nUse ${global.config.PREFIX}help to see other commands\n\nIf you notice an error in the bot, just report it using: ${global.config.PREFIX}callad or request a command!`,
      threadID
    );
  }

  try {
    // ✅ Get thread info safely
    const threadInfo = await api.getThreadInfo(threadID);
    const threadName = threadInfo.threadName || "this group";
    const totalMembers = threadInfo.participantIDs?.length || 0;

    for (let newParticipant of addedParticipants) {
      const userID = newParticipant.userFbId;

      // ✅ Skip kung bot mismo
      if (userID === api.getCurrentUserID()) continue;

      // ✅ Get user info safely
      let userName = "Friend";
      try {
        const userInfo = await api.getUserInfo(userID);
        if (userInfo?.[userID]?.name) {
          userName = userInfo[userID].name;
        }
      } catch (e) {
        console.warn("⚠️ Failed to get user info:", e.message);
      }

      // ✅ Build welcome message
      const msg = `Hello ${userName}!\nWelcome to ${threadName}!\nYou're the ${totalMembers}th member in this group, please enjoy!`;

      // ✅ API URL for welcome image
      const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/welcome?name=${encodeURIComponent(userName)}&userid=${userID}&threadname=${encodeURIComponent(threadName)}&members=${totalMembers}`;

      // ✅ Path for cache image
      const filePath = path.join(__dirname, "..", "commands", "cache", `welcome_${userID}.png`);

      // auto-create cache folder if not exists
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      // ✅ Callback after download
      const callback = () => {
        if (fs.existsSync(filePath)) {
          api.sendMessage({
            body: msg,
            attachment: fs.createReadStream(filePath),
            mentions: [{ tag: userName, id: userID }]
          }, threadID, () => fs.unlinkSync(filePath));
        } else {
          // Fallback: send text only
          api.sendMessage(msg, threadID);
        }
      };

      console.log(`📥 Generating welcome for ${userName} (${userID})`);

      // ✅ Request image with error handling
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
