module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "1.1.0",
  credits: "Kim Joseph DG Bien (fixed by ChatGPT)",
  description: "Join Notification with proper member count and names",
  dependencies: {
    "fs-extra": ""
  }
};

module.exports.run = async function({ api, event }) {
  const request = require("request");
  const fs = global.nodemodule["fs-extra"];

  const { threadID, logMessageData } = event;
  const addedParticipants = logMessageData.addedParticipants;

  // If bot was added
  if (addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
    api.changeNickname(`𝗕𝗢𝗧 ${global.config.BOTNAME} 【 ${global.config.PREFIX} 】`, threadID, api.getCurrentUserID());
    return api.sendMessage(
      `BOT CONNECTED!!\n\nThank you for using my BOT\nUse ${global.config.PREFIX}help to see other commands\n\nIf you notice an error in the bot, just report it using: ${global.config.PREFIX}callad or request a command!`,
      threadID
    );
  }

  try {
    // Get thread info to know total members
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
        mentions.push({ tag: userName, id: userID, fromIndex: 0 });
      }
    }

    // Format names nicely: "Alice", "Alice and Bob", "Alice, Bob and Charlie"
    let formattedNames = "";
    if (nameArray.length === 1) formattedNames = nameArray[0];
    else if (nameArray.length === 2) formattedNames = `${nameArray[0]} and ${nameArray[1]}`;
    else if (nameArray.length > 2) {
      formattedNames = `${nameArray.slice(0, -1).join(", ")} and ${nameArray.slice(-1)}`;
    }

    const msg = `Hello ${formattedNames}!\nWelcome to ${threadName}!\nYou're the ${totalMembers}th member in this group, please enjoy!`;

    // Random GIF for welcome
    const links = [
      "https://i.imgur.com/S2OBX1Q.gif",
      "https://i.imgur.com/QBToMbX.gif",
      "https://i.imgur.com/Yh5HVnI.gif",
      "https://i.imgur.com/6xTTMU7.gif"
    ];
    const randomLink = links[Math.floor(Math.random() * links.length)];

    const callback = () => {
      api.sendMessage({
        body: msg,
        attachment: fs.createReadStream(__dirname + "/cache/welcome.gif"),
        mentions
      }, threadID, () => fs.unlinkSync(__dirname + "/cache/welcome.gif"));
    };

    request(encodeURI(randomLink))
      .pipe(fs.createWriteStream(__dirname + "/cache/welcome.gif"))
      .on("close", callback);

  } catch (err) {
    console.error("ERROR in joinNoti module:", err);
  }
};
