const fs = require("fs");
const config = require("../../config.json"); // Corrected path to config.json from 'commands' folder

module.exports.config = {
  name: "addpremium",
  version: "1.0.0",
  permission: 1, // Admin-only permissions
  credits: "ChatGPT",
  description: "Adds a user to the premium list using UID or mention",
  commandCategory: "system",
  usages: "/addpremium <UID or @mention>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  // Check if the sender is an admin (only users in config.ADMINBOT can run this)
  if (!config.ADMINBOT.includes(senderID)) {
    return api.sendMessage("❌ You do not have permission to use this command.", threadID, messageID);
  }

  // Get the mentioned user or UID from the args
  let targetUID = args[0];

  // If the argument is a mention, extract the UID
  if (targetUID && targetUID.startsWith("@")) {
    targetUID = event.mentions[Object.keys(event.mentions)[0]].id; // Extract the UID from the mention
  }

  // If no valid targetUID is provided, return an error
  if (!targetUID) {
    return api.sendMessage("❌ Please provide a valid UID or mention a user to add to the premium list.", threadID, messageID);
  }

  // Check if the user is already in the premium list
  if (config.PREMIUM.includes(targetUID)) {
    return api.sendMessage("❌ This user is already a premium user.", threadID, messageID);
  }

  // Add the UID to the PREMIUM list
  config.PREMIUM.push(targetUID);

  // Save the updated config to config.json
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

  // Send a success message
  return api.sendMessage(`✅ User with UID ${targetUID} has been added to the premium list!`, threadID, messageID);
};
