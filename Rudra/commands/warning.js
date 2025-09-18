const { setData, getData } = require("../../database.js");

// List of violations
const badwords = [
  "tanga", "bobo", "gago", "puta", "pakyu", "inutil", "ulol",
  "fuck", "shit", "asshole", "bitch", "dumb", "stupid", "motherfucker", "pota", "tangina", "tang ina", "kantot", "jakol", "jakul", "jabol", "puke", "puki"
];
const racistWords = [
  "negro", "nigger", "chimp", "nigga", "baluga",
  "chink", "indio", "bakla", "niga", "bungal"// homophobic
];
const allowedLinks = ["facebook.com", "fb.com"];

// Randomized warning messages
const messages = {
  badword: [
    "Please maintain respect in this group.",
    "Offensive words are not tolerated here.",
    "Language matters. Kindly watch your words.",
    "This is your warning for using bad language."
  ],
  racist: [
    "Racist or discriminatory remarks are strictly prohibited.",
    "Respect diversity. Avoid racist language.",
    "This group does not tolerate any form of discrimination.",
    "Be mindful. Racist terms will not be accepted here."
  ],
  link: [
    "Unauthorized links are not allowed in this group.",
    "Please refrain from sharing suspicious links.",
    "Links outside the allowed list are prohibited.",
    "Your message contains an unauthorized link."
  ]
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Format warning UI
function formatWarning(name, type, note, count) {
  return `╭━━━[ ⚠️ WARNING ISSUED ]━━━╮
┃ 👤 User: @${name}
┃ 🚫 Violation: ${type}
┃ 📝 Note: ${note}
┃
┃ ⚠️ Your current warning count: ${count}
╰━━━━━━━━━━━━━━━━━━━━━━━╯`;
}

module.exports.config = {
  name: "warning",
  version: "1.0.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Auto warning system with command to check/list warnings",
  commandCategory: "system",
  usages: "/warning check @mention | /warning list",
  cooldowns: 5
};

// 📌 COMMANDS
module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, messageID, mentions } = event;

  if (args.length === 0) {
    return api.sendMessage("❌ Usage: /warning check @mention | /warning list", threadID, messageID);
  }

  const sub = args[0].toLowerCase();

  // /warning check @mention
  if (sub === "check") {
    const uid = Object.keys(mentions)[0];
    if (!uid) return api.sendMessage("❌ Please mention a user.", threadID, messageID);

    const warnings = await getData(`/warnings/${threadID}/${uid}`) || { count: 0 };
    let name = "User";
    try { name = await Users.getNameUser(uid); } catch {}

    return api.sendMessage(
      `👤 User: ${name}\n⚠️ Warning Count: ${warnings.count}`,
      threadID,
      messageID
    );
  }

  // /warning list
  if (sub === "list") {
    const data = await getData(`/warnings/${threadID}`) || {};
    let msg = "📋 Warning List:\n\n";

    if (Object.keys(data).length === 0) msg += "Wala pang na-warning.";
    else {
      for (const uid in data) {
        let name = "User";
        try { name = await Users.getNameUser(uid); } catch {}
        msg += `• ${name}: ${data[uid].count} warnings\n`;
      }
    }

    return api.sendMessage(msg, threadID, messageID);
  }
};

// 📌 AUTO-DETECTION
module.exports.handleEvent = async function({ api, event, Users }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body) return;

  const text = body.toLowerCase();
  let violationType = null;
  let note = "";

  // Detect badwords
  if (badwords.some(word => text.includes(word))) {
    violationType = "Bad Language";
    note = pickRandom(messages.badword);
  }

  // Detect racist words
  if (racistWords.some(word => text.includes(word))) {
    violationType = "Racist/Discriminatory Term";
    note = pickRandom(messages.racist);
  }

  // Detect unauthorized links
  if (text.includes("http") || text.includes("www.")) {
    const isAllowed = allowedLinks.some(link => text.includes(link));
    if (!isAllowed) {
      violationType = "Unauthorized Link";
      note = pickRandom(messages.link);
    }
  }

  if (!violationType) return;

  // Get warnings
  let warnings = await getData(`/warnings/${threadID}/${senderID}`);
  if (!warnings) warnings = { count: 0 };

  warnings.count++;
  await setData(`/warnings/${threadID}/${senderID}`, warnings);

  // Get violator name
  let name = "User";
  try { name = await Users.getNameUser(senderID); } catch {}

  // Send warning as reply
  api.sendMessage(
    {
      body: formatWarning(name, violationType, note, warnings.count),
      mentions: [{ tag: `@${name}`, id: senderID }]
    },
    threadID,
    null,
    messageID // reply to violator’s message
  );
};
