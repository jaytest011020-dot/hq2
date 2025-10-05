const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "mm",
  version: "1.2.0",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord La Peña",
  description: "Auto mention Midman when someone asks for one",
  commandCategory: "moderation",
  usages: "/mm on | off",
  cooldowns: 3
};

// 🔧 Configuration
const OWNER_UID = "61559999326713";
const MIDMANS = [
  { id: "61563731477181", name: "Klenth Jarred Dalupan" },
  { id: "61565984310103", name: "Kio |~Midman🌟" }
];

// 🔍 Keywords to detect
const KEYWORDS = [
  "sino avail mm",
  "pa mm",
  "sino avail na mm",
  "cno avail na mm",
  "cno avail mm",
  "may mm ba dito",
  "may mm b dito",
  "pa midman",
  "sino avail midman",
  "cno avail midman",
  "sino avail na midman",
  "cno avail na midman",
  "may available mm ba dito",
  "may avail mm ba dito"
];

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID } = event;

  // Only owner can toggle
  if (senderID !== OWNER_UID)
    return api.sendMessage("⛔ Only the bot owner can use this command.", threadID);

  if (!args[0]) 
    return api.sendMessage("📘 Usage: /mm on | off", threadID);

  const option = args[0].toLowerCase();
  if (option === "on") {
    await setData(`mm/${threadID}`, { enabled: true });
    return api.sendMessage("✅ Midman auto-mention is now ON.", threadID);
  } else if (option === "off") {
    await setData(`mm/${threadID}`, { enabled: false });
    return api.sendMessage("❌ Midman auto-mention is now OFF.", threadID);
  } else {
    return api.sendMessage("📘 Usage: /mm on | off", threadID);
  }
};

// 🧠 Event listener (detect keywords)
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, messageID, body } = event;
  if (!body) return;

  const config = await getData(`mm/${threadID}`);
  if (!config || !config.enabled) return;

  const lowerMsg = body.toLowerCase();

  // Check if message includes any keyword
  const found = KEYWORDS.some(keyword => lowerMsg.includes(keyword));
  if (!found) return;

  // 📣 Mention both midmans
  const mentions = MIDMANS.map(m => ({ tag: m.name, id: m.id }));
  const names = MIDMANS.map(m => `• ${m.name}`).join("\n");

  const replyMsg = {
    body: `📣 Available Midman:\n${names}`,
    mentions
  };

  return api.sendMessage(replyMsg, threadID, messageID);
};
