module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "1.8.0",
  credits: "Kim Joseph DG Bien + ChatGPT",
  description: "Join Notification with welcome image then video after 3 seconds",
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

  // 🧠 If bot is added to a new group
  if (addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
    api.changeNickname(
      `𝗕𝗢𝗧 ${global.config.BOTNAME} 【 ${global.config.PREFIX} 】`,
      threadID,
      api.getCurrentUserID()
    );
    return api.sendMessage(
      `✅ BOT CONNECTED!\n\nThanks for adding me!\nUse ${global.config.PREFIX}help to see commands.\nIf there's an issue, report it using ${global.config.PREFIX}callad.`,
      threadID
    );
  }

  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const threadName = threadInfo.threadName || "this group";
    const totalMembers = threadInfo.participantIDs?.length || 0;

    for (const newParticipant of addedParticipants) {
      const userID = newParticipant.userFbId;
      if (userID === api.getCurrentUserID()) continue;

      // 🔹 Get user name
      let userName = "Friend";
      try {
        const info = await api.getUserInfo(userID);
        if (info?.[userID]?.name) userName = info[userID].name;
      } catch {}

      // 🔹 Welcome message
      const msg = `Hello ${userName}!\nWelcome to ${threadName}!\nYou're the ${totalMembers}th member in this group. Enjoy your stay! 🎉`;

      // APIs
      const imgApi = `https://betadash-api-swordslush-production.up.railway.app/welcome?name=${encodeURIComponent(userName)}&userid=${userID}&threadname=${encodeURIComponent(threadName)}&members=${totalMembers}`;
      const videoApi = `https://betadash-shoti-yazky.vercel.app/shotizxx?apikey=shipazu`;

      // Cache directory
      const cacheDir = path.join(__dirname, "..", "commands", "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const imgPath = path.join(cacheDir, `welcome_${userID}.png`);
      const videoPath = path.join(cacheDir, `welcome_${userID}.mp4`);

      // 🖼 Download welcome image
      await new Promise((resolve, reject) => {
        request(imgApi)
          .pipe(fs.createWriteStream(imgPath))
          .on("close", resolve)
          .on("error", reject);
      });

      // 📨 Send welcome message + image first
      await new Promise((resolve) => {
        api.sendMessage({
          body: msg,
          attachment: fs.existsSync(imgPath) ? fs.createReadStream(imgPath) : null,
          mentions: [{ tag: userName, id: userID }]
        }, threadID, () => {
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
          resolve();
        });
      });

      // Wait 3 seconds ⏳
      await new Promise(r => setTimeout(r, 3000));

      // 🎬 Fetch video
      try {
        const res = await axios.get(videoApi, { timeout: 15000 });
        const videoUrl = res?.data?.shotiurl;

        if (!videoUrl) {
          console.warn("⚠️ No video URL found in API response:", res.data);
          continue;
        }

        // 📥 Download video
        const videoStream = await axios({
          url: videoUrl,
          method: "GET",
          responseType: "stream",
          maxRedirects: 5,
          timeout: 30000
        });

        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(videoPath);
          videoStream.data.pipe(writer);
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        // 🎥 Send video with message
        const caption = `Hello ${userName}, this is a welcome video for you! 🎥`;

        await new Promise((resolve) => {
          api.sendMessage({
            body: caption,
            attachment: fs.createReadStream(videoPath)
          }, threadID, () => {
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            resolve();
          });
        });

      } catch (err) {
        console.error("⚠️ Error fetching/sending video:", err.message);
      }
    }

  } catch (err) {
    console.error("❌ ERROR in joinNoti module:", err);
  }
};
