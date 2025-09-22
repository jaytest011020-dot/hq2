const { getData, setData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "codechecker",
  version: "1.1.0",
  hasPermssion: 2, // admin only
  description: "Check or mark pet redeem codes",
  usages: "/codechecker <code> [use]",
  commandCategory: "admin",
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  if (!ADMINBOT.includes(senderID))
    return api.sendMessage("❌ Only admins can use this command.", threadID, messageID);

  if (!args[0])
    return api.sendMessage("❌ Please provide a code to check.\nUsage: /codechecker <code> [use]", threadID, messageID);

  const inputCode = args[0].toUpperCase();
  const codesData = (await getData(`petredeem/codes`)) || {};

  if (!codesData[inputCode]) {
    return api.sendMessage("❌ Invalid code. It was never generated.", threadID, messageID);
  }

  const codeInfo = codesData[inputCode];
  let msg = `✅ Code is valid!\n\n` +
            `🐾 Pet Name: ${codeInfo.petName}\n` +
            `👤 Redeemed By: ${codeInfo.username} (${codeInfo.userID})\n` +
            `📌 Status: ${codeInfo.used ? "Used" : "Unused"}`;

  // If second arg is "use", mark it as used
  if (args[1]?.toLowerCase() === "use") {
    if (codeInfo.used) {
      msg = "⚠️ This code has already been marked as used.";
    } else {
      codeInfo.used = true;
      codesData[inputCode] = codeInfo;
      await setData(`petredeem/codes`, codesData);
      msg = `✅ Code marked as USED!\n\n🐾 Pet: ${codeInfo.petName}\n👤 Owner: ${codeInfo.username}`;
    }
  }

  return api.sendMessage(msg, threadID, messageID);
};
