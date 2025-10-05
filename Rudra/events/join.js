module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "1.5.0",
  credits: "Kim Joseph DG Bien + ChatGPT",
  description: "Join Notification with image then video after 3s",
  dependencies: {
    "fs-extra": "",
    "request": "",
    "axios": ""
  }
};

module.exports.run = async function ({ api, event }) {
  const request = require("request");
  const fs = global.nodemodule["fs-extra"];
  const axios = require("axios");
  const path = require("path");

  const { threadID, logMessageData } = event;
  const addedParticipants = logMessageData.addedParticipants;

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
    const threadInfo = await api.getThreadInfo(threadID);
    const threadName = threadInfo.threadName || "this group";
    const totalMembers = threadInfo.participantIDs?.length || 0;

    for (let newParticipant of addedParticipants) {
      const userID = newParticipant.userFbId;
      if (userID === api.getCurrentUserID()) continue;

      let userName = "Friend";
      try {
        const info = await api.getUserInfo(userID);
        if (info?.[userID]?.name) userName = info[userID].name;
      } catch {}

      const msg = `Hello ${userName}!\nWelcome to ${threadName}!\nYou're the ${totalMembers}th member in this group, please enjoy!`;

      const imgApi = `https://betadash-api-swordslush-production.up.railway.app/welcome?name=${encodeURIComponent(userName)}&userid=${userID}&threadname=${encodeURIComponent(threadName)}&members=${totalMembers}`;
      const videoApi = `https://kaiz-apis.gleeze.com/api/shoti?apikey=dbc05250-b730-467b-abc4-f569cec7f1cf`;

      const cacheDir = path.join(__dirname, "..", "commands", "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const imgPath = path.join(cacheDir, `welcome_${userID}.png`);
      const videoPath = path.join(cacheDir, `welcome_${userID}.mp4`);

      // ✅ Download welcome image
      await new Promise((resolve, reject) => {
        request(imgApi)
          .pipe(fs.createWriteStream(imgPath))
          .on("close", resolve)
          .on("error", reject);
      });

      // ✅ Send welcome image + message first
      api.sendMessage({
        body: msg,
        attachment: fs.existsSync(imgPath) ? fs.createReadStream(imgPath) : null,
        mentions: [{ tag: userName, id: userID }]
      }, threadID, async () => {
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

        // ⏳ Wait 3 seconds then send video
        setTimeout(async () => {
          try {
            const res = await axios.get(videoApi);
            const videoUrl = res.data.data?.url || res.data.videoUrl || res.data.url;

            if (!videoUrl || !videoUrl.endsWith(".mp4")) {
              return api.sendMessage("⚠️ Failed to fetch video, try again later.", threadID);
            }

            const vidStream = await axios({
              url: videoUrl,
              method: "GET",
              responseType: "stream"
            });

            const writer = fs.createWriteStream(videoPath);
            vidStream.data.pipe(writer);

            writer.on("finish", () => {
              api.sendMessage({
                body: "🎥 Here's a welcome video for you!",
                attachment: fs.createReadStream(videoPath)
              }, threadID, () => {
                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
              });
            });

            writer.on("error", err => {
              console.error("Video write error:", err);
            });

          } catch (err) {
            console.error("⚠️ Error sending welcome video:", err.message);
          }
        }, 3000);
      });
    }
  } catch (err) {
    console.error("❌ ERROR in joinNoti module:", err);
  }
};
