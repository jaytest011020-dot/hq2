module.exports.config = {
  name: "threadid",
  version: "1.0.0",
  credits: "ChatGPT",
  hasPermission: 0,
  description: "Check the current thread ID",
  usages: "/threadid",
  commandCategory: "utility",
  cooldowns: 3,
};

module.exports.run = async function({ api, event }) {
  try {
    const threadID = event.threadID;
    return api.sendMessage(`🆔 This thread's ID is: ${threadID}`, threadID);
  } catch (err) {
    return api.sendMessage("❌ Error fetching thread ID.", event.threadID);
  }
};
