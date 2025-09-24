const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "donator",
  version: "1.5.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Manage global donators. Only owner can add.",
  usages: "/donator add @mention | /donator",
  commandCategory: "admin",
  cooldowns: 3
};

// Owner UID
const OWNER_UID = "61559999326713";

module.exports.run = async function({ api, event, args, Users }) {
  const { senderID, mentions, threadID } = event;

  // --- Add donator ---
  if (args[0]?.toLowerCase() === "add") {
    if (senderID !== OWNER_UID) return api.sendMessage("❌ You are not allowed to add donators.", threadID);

    if (!mentions || Object.keys(mentions).length === 0) return api.sendMessage("❌ Please mention the user to add as donator.", threadID);

    const donators = (await getData("/donator")) || [];

    const added = [];
    for (let uid in mentions) {
      if (donators.find(d => d.uid === uid)) continue;

      const name = await Users.getName(uid);
      const link = `https://www.facebook.com/${uid}`;
      donators.push({ uid, name, link });
      added.push(name);
    }

    await setData("/donator", donators);

    return api.sendMessage(
      added.length > 0
        ? `✅ Added Donators:\n┌─────────────\n${added.map(n => `│ ${n}`).join("\n")}\n└─────────────`
        : "⚠️ All mentioned users are already donators.",
      threadID
    );
  }

  // --- List donators ---
  const donators = (await getData("/donator")) || [];
  if (!donators.length) return api.sendMessage("❌ No donators found.", threadID);

  let msg = "💎 Global Donators:\n┌──────────────────\n";
  donators.forEach((d, i) => {
    msg += `│ ${i + 1}. ${d.name} - ${d.link}\n`;
  });
  msg += "└──────────────────";

  api.sendMessage(msg, threadID);
};
