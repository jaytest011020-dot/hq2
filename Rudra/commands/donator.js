const { getData, setData } = require("../../database.js");

const OWNER_UID = "61559999326713";

module.exports.config = {
  name: "donator",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Manage donator list",
  usages: "/donator add @mention | /donator",
  commandCategory: "admin",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, mentions } = event;

  // --- ADD DONATOR ---
  if (args[0]?.toLowerCase() === "add") {
    if (senderID !== OWNER_UID) return api.sendMessage("❌ You are not allowed to add donators.", threadID);
    if (!mentions || Object.keys(mentions).length === 0)
      return api.sendMessage("❌ Please mention the user to add as donator.", threadID);

    const donators = (await getData("/donator")) || [];
    const added = [];

    // Loop through mentioned users
    for (let uid of Object.keys(mentions)) {
      const name = mentions[uid];
      const link = `https://www.facebook.com/${uid}`;
      if (!donators.find(d => d.uid === uid)) {
        donators.push({ uid, name, link });
        added.push({ name, link });
      }
    }

    await setData("/donator", donators);

    if (added.length === 0)
      return api.sendMessage("⚠️ All mentioned users are already donators.", threadID);

    // Send success UI
    const msg = `✅ Added Donators:\n┌─────────────\n${added.map(d => `│ ${d.name}`).join("\n")}\n└─────────────`;
    return api.sendMessage(msg, threadID);
  }

  // --- LIST DONATORS ---
  const donators = (await getData("/donator")) || [];
  if (!donators.length) return api.sendMessage("❌ No donators found.", threadID);

  const msg = `💖 Donator List (Total: ${donators.length})\n┌─────────────\n${donators
    .map(d => `│ ${d.name} - ${d.link}`)
    .join("\n\n")}\n└─────────────`;

  return api.sendMessage(msg, threadID);
};
