const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "welcomevideo",
  version: "1.0.0",
  hasPermission: 1,
  credits: "ChatGPT + Jaylord La Peña",
  description: "Toggle welcome video on/off per group",
  commandCategory: "group",
  usages: "/welcomevideo on | off",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID } = event;

  if (!args[0])
    return api.sendMessage("📘 Usage: /welcomevideo on | off", threadID);

  const option = args[0].toLowerCase();

  if (option === "on") {
    await setData(`welcomeVideo/${threadID}`, { enabled: true });
    return api.sendMessage("✅ Welcome video is now ON for this group.", threadID);
  } 
  else if (option === "off") {
    await setData(`welcomeVideo/${threadID}`, { enabled: false });
    return api.sendMessage("❌ Welcome video is now OFF for this group.", threadID);
  } 
  else {
    return api.sendMessage("📘 Usage: /welcomevideo on | off", threadID);
  }
};