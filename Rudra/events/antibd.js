module.exports.config = {
  name: "antibd",
  eventType: ["log:user-nickname"],
  version: "0.0.2",
  credits: "Priyansh Rajput (modified by ChatGPT)",
  description: "Prevents changing the bot's nickname"
};

module.exports.run = async function({ api, event, Users, Threads }) {
  const { logMessageData, threadID, author } = event;
  const botID = api.getCurrentUserID();
  const { BOTNAME, ADMINBOT } = global.config;

  // Get saved nickname from thread data, fallback to BOTNAME
  let { nickname } = await Threads.getData(threadID, botID);
  nickname = nickname ? nickname : BOTNAME;

  // Check if someone (not bot or admin) changed bot nickname
  if (
    logMessageData.participant_id == botID &&
    author != botID &&
    !ADMINBOT.includes(author) &&
    logMessageData.nickname != nickname
  ) {
    // Restore nickname
    api.changeNickname(nickname, threadID, botID);

    // Get user info
    const info = await Users.getData(author);

    // Custom message
    return api.sendMessage(
      {
        body: `⚠️ Hey ${info.name}, you are not allowed to change the bot's nickname! 😼\nNickname has been restored to: ${nickname}`
      },
      threadID
    );
  }
};
