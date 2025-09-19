module.exports.config = {
  name: "threadid",
  version: "1.0.0",
  credits: "ChatGPT",
  hasPermssion: 0,
  description: "Check the current thread ID",
  usages: "/threadid",
  commandCategory: "utility",
  cooldowns: 3,
};

module.exports.run = async function({ api, event }) {
  try {
    const threadID = event.threadID;
    return api.sendMessage(`🆔 This thread's ID is: ${threadID}`, threadID, event.messageID);
  } catch (err) {
    return api.sendMessage("❌ Nagka-error habang kinukuha ang Thread ID.", event.threadID, event.messageID);
  }
};
