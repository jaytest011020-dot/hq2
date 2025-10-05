const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "mm",
  version: "1.2.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Auto mention midman when someone asks for MM",
  commandCategory: "utility",
  usages: "/mm on | /mm off",
  cooldowns: 5
};

// 🔹 UIDs
const OWNER_UID = "61559999326713"; // ikaw lang pwede mag on/off
const MIDMAN_UID = "61563731477181"; // Klenth Jarred Dalupan

// 🔹 List of trigger keywords
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
  "cno avail na midman"
];

// 🧩 Command: /mm on | off
module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  // 🔐 Only owner can toggle
  if (senderID !== OWNER_UID)
    return api.sendMessage("⛔ Only the owner (Jaylord La Peña) can use this command.", threadID, messageID);

  if (!args[0])
    return api.sendMessage("❗ Usage: /mm on or /mm off", threadID, messageID);

  const option = args[0].toLowerCase();
  if (option !== "on" && option !== "off")
    return api.sendMessage("❗ Please use: /mm on or /mm off", threadID, messageID);

  const enabled = option === "on";
  await setData(`mm/${threadID}`, { enabled });

  return api.sendMessage(
    enabled ? "✅ Auto MM mention is now ON." : "❌ Auto MM mention is now OFF.",
    threadID,
    messageID
  );
};

// 🧠 Auto-detect MM messages
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, body, messageID } = event;
  if (!body) return;

  const config = await getData(`mm/${threadID}`);
  if (!config || !config.enabled) return;

  const msg = body.toLowerCase().trim();
  if (KEYWORDS.some(k => msg.includes(k))) {
    try {
      const info = await api.getUserInfo(MIDMAN_UID);
      const name = info?.[MIDMAN_UID]?.name || "Midman";

      api.sendMessage(
        {
          body: `🔔 Need MM? Here's our available midman:\n@${name}`,
          mentions: [{ tag: name, id: MIDMAN_UID }]
        },
        threadID,
        messageID // ✅ reply mismo sa triggering message
      );
    } catch (e) {
      console.error("MM mention error:", e);
    }
  }
};
