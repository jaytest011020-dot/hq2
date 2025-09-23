const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "donator",
  version: "1.1.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Add and list official donators (Global)",
  usages: "/donator add <Name> <FB link> | /donator",
  commandCategory: "admin",
  cooldowns: 3,
};

const OWNER_UID = "61559999326713"; // Only this UID can add

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  // Global path for donators
  let donators = (await getData("/global/donators")) || [];

  if (args[0]?.toLowerCase() === "add") {
    if (senderID !== OWNER_UID)
      return api.sendMessage("❌ You are not allowed to add donators.", threadID, messageID);

    const name = args[1];
    const fbLink = args[2];
    if (!name || !fbLink)
      return api.sendMessage("❌ Usage: /donator add <Name> <FB link>", threadID, messageID);

    // Add donator globally
    donators.push({ name, fbLink });
    await setData("/global/donators", donators);

    return api.sendMessage(`✅ Donator added globally:\nName: ${name}\nFB: ${fbLink}`, threadID, messageID);
  }

  // List donators with double line box UI
  if (!donators.length)
    return api.sendMessage("❌ No donators found.", threadID, messageID);

  let msg = "💎 GLOBAL DONATORS 💎\n\n";
  donators.forEach(d => {
    const nameLine = `║ ${d.name.padEnd(17)} ║`;
    const fbLine = `║ ${d.fbLink.padEnd(17)} ║`;
    msg += `╔═══════════════════╗\n${nameLine}\n${fbLine}\n╚═══════════════════╝\n\n`;
  });

  api.sendMessage(msg.trim(), threadID, messageID);
};
