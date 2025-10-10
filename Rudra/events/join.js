const { getData } = require("../../database.js");

module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "2.0.0",
  credits: "Kim Joseph DG Bien + ChatGPT + Jaylord La Peña",
  description: "Join Notification with welcome image and optional video",
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

    // 🧩 Check video toggle per GC
    const videoConfig = await getData(`welcomeVideo/${threadID}`);
    const videoEnabled = videoConfig?.enabled || false;

    for (const newParticipant of addedParticipants) {
      const userID = newParticipant.userFbId;
      if (userID === api.getCurrentUserID()) continue;

      let userName = "Friend";
      try {
        const info = await api.getUserInfo(userID);
        if (info?.[userID]?.name) userName = info[userID].name;
      } catch {}

      const msg = `Hello ${userName}!\nWelcome to ${threadName}!\nYou're the ${totalMembers}th member in this group. Enjoy your stay! 🎉`;

      const imgApi = `https://betadash-api-swordslush-production.up.railway.app/welcome?name=${encodeURIComponent(userName)}&userid=${userID}&threadname=${encodeURIComponent(threadName)}&members=${totalMembers}`;
      const videoApi = `https://betadash-shoti-yazky.vercel.app/shotizxx?apikey=shipazu`;

      const cacheDir = path.join(__dirname, "..", "commands", "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const imgPath = path.join(cacheDir, `welcome_${userID}.png`);
      const videoPath = path.join(cacheDir, `welcome_${userID}.mp4`);

      // 🖼 Send welcome image
      await new Promise((resolve, reject) => {
        request(imgApi)
          .pipe(fs.createWriteStream(imgPath))
          .on("close", resolve)
          .on("error", reject);
      });

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

      // Wait 3s ⏳ then send video only if ON
      if (!videoEnabled) continue;
      await new Promise(r => setTimeout(r, 3000));

      try {
        const res = await axios.get(videoApi, { timeout: 15000 });
        const videoUrl = res?.data?.shotiurl;
        if (!videoUrl) continue;

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

        await new Promise((resolve) => {
          api.sendMessage({
            body: `🎥 Welcome video for you, ${userName}!`,
            attachment: fs.createReadStream(videoPath)
          }, threadID, () => {
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            resolve();
          });
        });
      } catch (err) {
        console.error("⚠️ Error sending video:", err.message);
      }
    }
  } catch (err) {
    console.error("❌ ERROR in joinNoti module:", err);
  }
};