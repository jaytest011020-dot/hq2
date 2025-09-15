module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "1.1.1",
  credits: "Kim Joseph DG Bien (optimized by ChatGPT)",
  description: "Join Notification with proper member count and names",
  dependencies: {
    "fs-extra": "",
    "axios": ""
  }
};

module.exports.run = async function ({ api, event }) {
  const fs = global.nodemodule["fs-extra"];
  const axios = require("axios");

  const { threadID, logMessageData } = event;
  const addedParticipants = logMessageData.addedParticipants;

  // If bot was added
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
    const totalMembers = threadInfo.participantIDs.length;

    let nameArray = [];
    let mentions = [];

    for (let newParticipant of addedParticipants) {
      const userID = newParticipant.userFbId;
      const userInfo = await api.getUserInfo(userID);
      const userName = Object.values(userInfo)[0]?.name || "Friend";

      if (userID !== api.getCurrentUserID()) {
        nameArray.push(userName);
        mentions.push({ tag: userName, id: userID, fromIndex: msg?.length || 0 });
      }
    }

    // Format names nicely
    let formattedNames = "";
    if (nameArray.length === 1) formattedNames = nameArray[0];
    else if (nameArray.length === 2) formattedNames = `${nameArray[0]} and ${nameArray[1]}`;
    else if (nameArray.length > 2)
      formattedNames = `${nameArray.slice(0, -1).join(", ")} and ${nameArray.slice(-1)}`;

    const msg = `Hello ${formattedNames}!\nWelcome to ${threadName}!\nYou're the ${totalMembers}th member in this group, please enjoy!`;

    // Random GIF
    const links = [
      "https://i.imgur.com/S2OBX1Q.gif",
      "https://i.imgur.com/QBToMbX.gif",
      "https://i.imgur.com/Yh5HVnI.gif",
      "https://i.imgur.com/6xTTMU7.gif"
    ];
    const randomLink = links[Math.floor(Math.random() * links.length)];

    const gifPath = __dirname + "/cache/welcome.gif";

    const response = await axios.get(randomLink, { responseType: "arraybuffer" });
    fs.writeFileSync(gifPath, Buffer.from(response.data, "binary"));

    api.sendMessage(
      {
        body: msg,
        attachment: fs.createReadStream(gifPath),
        mentions
      },
      threadID,
      () => fs.unlinkSync(gifPath) // delete after sending
    );

  } catch (err) {
    console.error("ERROR in joinNoti module:", err);
  }
};
