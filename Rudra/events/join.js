const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "3.0.0",
  credits: "ChatGPT + Kim Joseph DG Bien + Kaizenji API",
  description: "Join notification with both video and image attachment",
  dependencies: {
    "axios": "",
    "fs-extra": ""
  }
};

module.exports.run = async function ({ api, event }) {
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
    // ✅ Get thread info
    const threadInfo = await api.getThreadInfo(threadID);
    const threadName = threadInfo.threadName || "this group";
    const totalMembers = threadInfo.participantIDs?.length || 0;

    for (let newParticipant of addedParticipants) {
      const userID = newParticipant.userFbId;
      if (userID === api.getCurrentUserID()) continue;

      let userName = "Friend";
      try {
        const userInfo = await api.getUserInfo(userID);
        if (userInfo?.[userID]?.name) {
          userName = userInfo[userID].name;
        }
      } catch {
        console.warn("⚠️ Failed to get user info.");
      }

      // ✅ Welcome message
      const msg = `👋 Welcome ${userName}!\n\nPlease enjoy your stay in ${threadName}.\nYou're the ${totalMembers}th member of the group!`;

      // ✅ API URLs
      const imageApi = `https://betadash-api-swordslush-production.up.railway.app/welcome?name=${encodeURIComponent(userName)}&userid=${userID}&threadname=${encodeURIComponent(threadName)}&members=${totalMembers}`;
      const videoApi = `https://kaiz-apis.gleeze.com/api/pogisigena?apikey=dbc05250-b730-467b-abc4-f569cec7f1cf`;

      // ✅ Paths
      const cacheDir = path.join(__dirname, "..", "commands", "cache");
      await fs.ensureDir(cacheDir);
      const imagePath = path.join(cacheDir, `welcome_${userID}.png`);
      const videoPath = path.join(cacheDir, `welcome_${userID}.mp4`);

      let videoUrl = "";
      try {
        const res = await axios.get(videoApi);
        videoUrl = res.data.videoUrl;
      } catch (err) {
        console.error("❌ Failed to fetch video URL:", err.message);
      }

      // ✅ Download image
      try {
        const response = await axios.get(imageApi, { responseType: "arraybuffer" });
        fs.writeFileSync(imagePath, Buffer.from(response.data, "binary"));
      } catch (err) {
        console.error("❌ Failed to download image:", err.message);
      }

      // ✅ Download video (if available)
      if (videoUrl) {
        try {
          const response = await axios.get(videoUrl, { responseType: "arraybuffer" });
          fs.writeFileSync(videoPath, Buffer.from(response.data, "binary"));
        } catch (err) {
          console.error("❌ Failed to download video:", err.message);
        }
      }

      // ✅ Prepare attachments
      const attachments = [];
      if (fs.existsSync(imagePath)) attachments.push(fs.createReadStream(imagePath));
      if (fs.existsSync(videoPath)) attachments.push(fs.createReadStream(videoPath));

      // ✅ Send message with both attachments
      if (attachments.length > 0) {
        api.sendMessage({
          body: msg,
          attachment: attachments,
          mentions: [{ tag: userName, id: userID }]
        }, threadID, () => {
          // Clean up cache
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
          if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        });
      } else {
        api.sendMessage(msg, threadID);
      }
    }
  } catch (err) {
    console.error("❌ ERROR in joinNoti module:", err);
  }
};
