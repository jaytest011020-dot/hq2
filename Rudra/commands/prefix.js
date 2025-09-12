module.exports.config = {
  name: "prefix",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Jaylord La Peña", // updated owner
  description: "Show bot prefix details",
  commandCategory: "Admin",
  usages: "",
  cooldowns: 5,
};

module.exports.handleEvent = async ({ event, api, Threads }) => {
  const { threadID, messageID, body } = event;
  if (!body) return;

  // Keywords that trigger prefix response
  const triggers = [
    "prefix", "what prefix", "what is the prefix",
    "bot prefix", "command prefix", "how to use bot",
    "where prefix", "bot not working", "bot offline"
  ];

  const match = triggers.find(
    t => body.toLowerCase().includes(t.toLowerCase())
  );

  if (match) {
    const dataThread = await Threads.getData(threadID);
    const data = dataThread.data || {};
    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    const prefix = threadSetting.PREFIX || global.config.PREFIX || "/";

    return api.sendMessage(
      `🤖 My command prefix is: [ ${prefix} ]\n\n👑 Owner: Jaylord La Peña\n📌 For help, just type ${prefix}help`,
      threadID,
      messageID
    );
  }
};

module.exports.run = async ({ event, api }) => {
  return api.sendMessage("⚠️ This command cannot be used directly.", event.threadID);
};
