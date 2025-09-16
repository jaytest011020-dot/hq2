module.exports.config = {
  name: "leave",
  eventType: ["log:unsubscribe"],
  version: "2.0.0",
  credits: "ChatGPT",
  description: "Notify when someone leaves or is kicked (using API image)",
  dependencies: {
    "fs-extra": "",
    "request": ""
  }
};

module.exports.run = async function ({ api, event }) {
  if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;

  const fs = global.nodemodule["fs-extra"];
  const request = global.nodemodule["request"];
  const path = require("path");

  const { threadID } = event;
  const leftID = event.logMessageData.leftParticipantFbId;

  try {
    // Get user info
    const userInfo = await api.getUserInfo(leftID);
    const name = userInfo[leftID]?.name || "Friend";

    // Member count
    const threadInfo = await api.getThreadInfo(threadID);
    const memberCount = threadInfo.participantIDs.length;

    // Mentions
    const mentions = [{ tag: name, id: leftID, fromIndex: 0 }];

    // Message
    const msg = `${name} left the group.\nCurrent members: ${memberCount}`;

    // API for custom leave image
    const apiURL = `https://betadash-api-swordslush-production.up.railway.app/rip?userid=${leftID}`;

    // Path to save image in commands/cache
    const filePath = path.join(__dirname, "..", "commands", "cache", `leave_${leftID}.png`);
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const callback = () => {
      api.sendMessage(
        { body: msg, attachment: fs.createReadStream(filePath), mentions },
        threadID,
        () => fs.unlinkSync(filePath)
      );
    };

    // Download API image
    request(encodeURI(apiURL))
      .pipe(fs.createWriteStream(filePath))
      .on("close", callback)
      .on("error", (err) => console.error("❌ Error downloading leave image:", err));

  } catch (err) {
    console.error("❌ ERROR in leave module:", err);
  }
};
