module.exports.config = {
  name: "leaveNoti",
  eventType: ["log:unsubscribe"],
  version: "2.0.1",
  credits: "ChatGPT (fixed & safe)",
  description: "Notify when someone leaves or is kicked (using API image)",
  dependencies: {
    "fs-extra": "",
    "request": ""
  }
};

module.exports.run = async function ({ api, event }) {
  const fs = global.nodemodule["fs-extra"];
  const request = global.nodemodule["request"];
  const path = require("path");

  const { threadID, logMessageData } = event;
  const leftID = logMessageData.leftParticipantFbId;

  // ✅ Skip kung bot mismo yung umalis
  if (leftID == api.getCurrentUserID()) return;

  try {
    // ✅ Get user info safely
    let name = "Friend";
    try {
      const userInfo = await api.getUserInfo(leftID);
      if (userInfo?.[leftID]?.name) {
        name = userInfo[leftID].name;
      }
    } catch (e) {
      console.warn("⚠️ Failed to get user info:", e.message);
    }

    // ✅ Get thread info safely
    let memberCount = 0;
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      memberCount = threadInfo.participantIDs?.length || 0;
    } catch (e) {
      console.warn("⚠️ Failed to get thread info:", e.message);
    }

    // Mentions
    const mentions = [{ tag: name, id: leftID, fromIndex: 0 }];

    // Message
    const msg = `${name} left the group.\nCurrent members: ${memberCount}`;

    // ✅ API for custom leave image
    const apiURL = `https://betadash-api-swordslush-production.up.railway.app/rip?userid=${leftID}`;

    // ✅ Path to save image in commands/cache
    const filePath = path.join(__dirname, "..", "commands", "cache", `leave_${leftID}.png`);
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    // ✅ Callback after download
    const callback = () => {
      if (fs.existsSync(filePath)) {
        api.sendMessage(
          { body: msg, attachment: fs.createReadStream(filePath), mentions },
          threadID,
          () => fs.unlinkSync(filePath)
        );
      } else {
        api.sendMessage({ body: msg, mentions }, threadID);
      }
    };

    // ✅ Download image with error handling
    request(encodeURI(apiURL))
      .pipe(fs.createWriteStream(filePath))
      .on("close", callback)
      .on("error", (err) => {
        console.error("❌ Error downloading leave image:", err.message);
        api.sendMessage({ body: msg, mentions }, threadID);
      });

  } catch (err) {
    console.error("❌ ERROR in leaveNoti module:", err);
  }
};
