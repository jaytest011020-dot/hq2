const { getData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "codechecker",
  version: "1.0.0",
  hasPermssion: 2, // admin only
  description: "Check if a pet redeem code is valid",
  usages: "/codechecker <code>",
  commandCategory: "admin",
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  if (!ADMINBOT.includes(senderID))
    return api.sendMessage("❌ Only admins can use this command.", threadID, messageID);

  if (!args[0])
    return api.sendMessage("❌ Please provide a code to check.\nUsage: /codechecker <code>", threadID, messageID);

  const inputCode = args[0].toUpperCase();
  const codesData = (await getData(`petredeem/codes`)) || {};

  if (!codesData[inputCode]) {
    return api.sendMessage("❌ Invalid code. It was never generated.", threadID, messageID);
  }

  const codeInfo = codesData[inputCode];

  const msg = `✅ Code is valid!\n\n` +
              `🐾 Pet Name: ${codeInfo.petName}\n` +
              `💰 Redeemed By: ${codeInfo.username} (${codeInfo.userID})\n` +
              `📌 Status: ${codeInfo.used ? "Used" : "Unused"}`;

  return api.sendMessage(msg, threadID, messageID);
};
