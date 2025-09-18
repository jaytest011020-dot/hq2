const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "../../config.json"); // ensure main root path
let config = require(configPath);

module.exports.config = {
  name: "addpremium",
  version: "1.1.0",
  permission: 1, // Admin-only permissions
  credits: "ChatGPT + Fixed by NN",
  description: "Adds a user to the premium list using UID or mention",
  commandCategory: "system",
  usages: "/addpremium <UID or @mention>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  // Check if the sender is an admin
  if (!config.ADMINBOT.includes(senderID)) {
    return api.sendMessage("❌ You do not have permission to use this command.", threadID, messageID);
  }

  let targetUID;

  // If mention
  if (event.mentions && Object.keys(event.mentions).length > 0) {
    targetUID = Object.keys(event.mentions)[0]; // UID ng na-mention
  } else if (args[0]) {
    // If UID manually given
    targetUID = args[0];
  }

  // If no UID found
  if (!targetUID) {
    return api.sendMessage("❌ Please provide a valid UID or mention a user to add to the premium list.", threadID, messageID);
  }

  // Check if already premium
  if (config.PREMIUM.includes(targetUID)) {
    return api.sendMessage("❌ This user is already a premium user.", threadID, messageID);
  }

  // Add to PREMIUM list
  config.PREMIUM.push(targetUID);

  // Save to root config.json
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  return api.sendMessage(`✅ User with UID ${targetUID} has been added to the premium list!`, threadID, messageID);
};
