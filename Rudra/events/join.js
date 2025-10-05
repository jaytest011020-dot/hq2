module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "1.6.0",
  credits: "Kim Joseph DG Bien + ChatGPT",
  description: "Join Notification with image then video after 3s (downloads MP4 via stream)",
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

  // If bot was added -> set nickname and announce
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

    for (const newParticipant of addedParticipants) {
      const userID = newParticipant.userFbId;
      if (userID === api.getCurrentUserID()) continue;

      // get username safely
      let userName = "Friend";
      try {
        const info = await api.getUserInfo(userID);
        if (info?.[userID]?.name) userName = info[userID].name;
      } catch (e) {
        console.warn("joinNoti: failed to get user info:", e?.message || e);
      }

      // welcome text
      const msg = `Hello ${userName}!\nWelcome to ${threadName}!\nYou're the ${totalMembers}th member in this group, please enjoy!`;

      // APIs
      const imgApi = `https://betadash-api-swordslush-production.up.railway.app/welcome?name=${encodeURIComponent(userName)}&userid=${userID}&threadname=${encodeURIComponent(threadName)}&members=${totalMembers}`;
      const videoApi = `https://kaiz-apis.gleeze.com/api/shoti?apikey=dbc05250-b730-467b-abc4-f569cec7f1cf`;

      // cache paths
      const cacheDir = path.join(__dirname, "..", "commands", "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const imgPath = path.join(cacheDir, `welcome_${userID}.png`);
      const videoPath = path.join(cacheDir, `welcome_${userID}.mp4`);

      // download image (request stream)
      try {
        await new Promise((resolve, reject) => {
          request(imgApi)
            .pipe(fs.createWriteStream(imgPath))
            .on("close", resolve)
            .on("error", reject);
        });
      } catch (err) {
        console.error("joinNoti: failed to download image:", err?.message || err);
      }

      // send image + message first
      try {
        await new Promise((resolve) => {
          api.sendMessage({
            body: msg,
            attachment: fs.existsSync(imgPath) ? fs.createReadStream(imgPath) : null,
            mentions: [{ tag: userName, id: userID }]
          }, threadID, () => {
            // delete image after sending
            try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch (e) {}
            resolve();
          });
        });
      } catch (err) {
        console.error("joinNoti: failed to send image message:", err?.message || err);
      }

      // wait 3 seconds then fetch and send video
      await new Promise(r => setTimeout(r, 3000));

      try {
        // call the shoti API (expecting JSON)
        const shotiRes = await axios.get(videoApi, { timeout: 15000, maxRedirects: 5 });
        // support multiple possible shapes; you provided:
        // { status: "success", shoti: { videoUrl: "https://...mp4", ... } }
        const videoUrl = shotiRes?.data?.shoti?.videoUrl || shotiRes?.data?.videoUrl || shotiRes?.data?.url || null;

        if (!videoUrl) {
          console.warn("joinNoti: video URL not found in shoti response:", JSON.stringify(shotiRes.data).slice(0, 200));
          // optional: send fallback message or skip silently
          // api.sendMessage("⚠️ Welcome video currently unavailable.", threadID);
          continue;
        }

        // ensure it's probably an mp4 or direct media
        // If it doesn't end with .mp4 we still try (some servers don't use extension)
        // Download as stream and wait until finished writing
        const vidResp = await axios({
          url: videoUrl,
          method: "GET",
          responseType: "stream",
          maxRedirects: 5,
          timeout: 30000
        });

        // pipe to file and await finish
        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(videoPath);
          vidResp.data.pipe(writer);
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        // send video (playable)
        await new Promise((resolve) => {
          api.sendMessage({
            body: "", // optional short caption; keep empty if you want only the video
            attachment: fs.createReadStream(videoPath)
          }, threadID, () => {
            // cleanup video file
            try { if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch (e) {}
            resolve();
          });
        });

      } catch (err) {
        console.error("joinNoti: failed to fetch/send video:", err?.message || err);
        // optional: notify thread about failure
        // await api.sendMessage("⚠️ Failed to send welcome video.", threadID);
      }
    } // end loop addedParticipants
  } catch (err) {
    console.error("❌ ERROR in joinNoti module:", err);
  }
};
