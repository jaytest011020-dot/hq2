const fs = require("fs");

module.exports.config = {
  name: "addpremium",
  version: "1.4.0",
  permission: 1, // Admin-only permissions
  credits: "ChatGPT + Fixed by NN",
  description: "Adds a user to the premium list using UID or mention",
  commandCategory: "system",
  usages: "/addpremium <UID or @mention>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID, mentions } = event;
  const { configPath } = global.client;     // ✅ centralized config path
  const config = global.config;             // ✅ live config
  const { ADMINBOT } = global.config;

  // Check if the sender is an admin
  if (!ADMINBOT || !ADMINBOT.includes(senderID)) {
    return api.sendMessage(
      "❌ You do not have permission to use this command.",
      threadID,
      messageID
    );
  }

  let targetUID;

  // If mention
  if (mentions && Object.keys(mentions).length > 0) {
    targetUID = Object.keys(mentions)[0];
  } else if (args[0]) {
    // If UID manually given
    targetUID = args[0];
  }

  // If no UID found
  if (!targetUID) {
    return api.sendMessage(
      "❌ Please provide a valid UID or mention a user to add to the premium list.",
      threadID,
      messageID
    );
  }

  // Ensure PREMIUM exists
  if (!Array.isArray(config.PREMIUM)) {
    config.PREMIUM = [];
  }

  // Check if already premium
  if (config.PREMIUM.includes(targetUID)) {
    return api.sendMessage(
      `⚠️ User with UID ${targetUID} is already a premium user.`,
      threadID,
      messageID
    );
  }

  // Add to PREMIUM list
  config.PREMIUM.push(targetUID);

  // Save to root config.json
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Reload global.config to apply immediately
  delete require.cache[require.resolve(configPath)];
  global.config = require(configPath);

  return api.sendMessage(
    `✅ User with UID ${targetUID} has been added to the premium list!`,
    threadID,
    messageID
  );
};
