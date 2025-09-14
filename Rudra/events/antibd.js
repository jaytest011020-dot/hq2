module.exports.config = {
  name: "antibd",
  eventType: ["log:user-nickname"],
  version: "0.0.3",
  credits: "Priyansh Rajput (modified by ChatGPT)",
  description: "Prevents changing the bot's nickname"
};

module.exports.run = async function({ api, event, Users, Threads }) {
  const { logMessageData, threadID, author } = event;
  const botID = api.getCurrentUserID();
  const { BOTNAME, ADMINBOT = [] } = global.config;

  // Default nickname = BOTNAME
  let nickname = BOTNAME;

  try {
    // If you saved thread-specific nickname
    let dataThread = await Threads.getData(threadID);
    if (dataThread?.data?.botNickname) {
      nickname = dataThread.data.botNickname;
    }
  } catch (e) {
    console.log("No saved thread nickname, fallback to BOTNAME");
  }

  // Check if someone (not bot or admin) changed bot nickname
  if (
    logMessageData.participant_id == botID &&
    author != botID &&
    !ADMINBOT.includes(author) &&
    logMessageData.nickname != nickname
  ) {
    // Restore nickname
    api.changeNickname(nickname, threadID, botID);

    // Get user info safely
    let info;
    try {
      info = await Users.getData(author);
    } catch {
      info = { name: "Unknown User" };
    }

    // Custom message
    return api.sendMessage(
      `⚠️ Hey ${info.name}, you are not allowed to change the bot's nickname!\nNickname has been restored to: ${nickname}`,
      threadID
    );
  }
};
