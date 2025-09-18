const { setData, getData } = require("../../database.js");

// List of violations
const badwords = [
  "tanga", "bobo", "gago", "puta", "pakyu", "inutil", "ulol",
  "fuck", "shit", "asshole", "bitch", "dumb", "stupid", "motherfucker", "pota", "tangina", "tang ina", "kantot", "jakol", "jakul", "jabol", "puke", "puki", "baliw"
];
const racistWords = [
  "negro", "nigger", "chimp", "nigga", "baluga",
  "chink", "indio", "bakla", "niga", "bungal"
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

// Helper para laging fresh username
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    if (info && info[uid]?.name) return info[uid].name;
    return "User";
  } catch {
    return "User";
  }
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
  version: "2.0.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Auto warning system with per-thread DB",
  commandCategory: "system",
  usages: "/warning check @mention | /warning list",
  cooldowns: 5
};

// 📌 COMMANDS
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, mentions } = event;

  if (args.length === 0) {
    return api.sendMessage("❌ Usage: /warning check @mention | /warning list", threadID, messageID);
  }

  const sub = args[0].toLowerCase();

  // /warning check @mention
  if (sub === "check") {
    const uid = Object.keys(mentions)[0];
    if (!uid) return api.sendMessage("❌ Please mention a user.", threadID, messageID);

    const warnings = await getData(`${threadID}_warnings_${uid}`) || { count: 0 };
    const name = await getUserName(uid, api);

    return api.sendMessage(
      `👤 User: ${name}\n⚠️ Warning Count: ${warnings.count}`,
      threadID,
      messageID
    );
  }

  // /warning list
  if (sub === "list") {
    let msg = "📋 Warning List:\n\n";
    let found = false;

    const data = await getData(threadID + "_warnings_all") || [];
    for (const uid of data) {
      const warnings = await getData(`${threadID}_warnings_${uid}`);
      if (warnings && warnings.count > 0) {
        const name = await getUserName(uid, api);
        msg += `• ${name}: ${warnings.count} warnings\n`;
        found = true;
      }
    }

    if (!found) msg += "Wala pang na-warning.";

    return api.sendMessage(msg, threadID, messageID);
  }
};

// 📌 AUTO-DETECTION
module.exports.handleEvent = async function({ api, event }) {
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
  let warnings = await getData(`${threadID}_warnings_${senderID}`);
  if (!warnings) warnings = { count: 0 };

  warnings.count++;
  await setData(`${threadID}_warnings_${senderID}`, warnings);

  // Track sa list of warned users para sa /warning list
  let all = await getData(threadID + "_warnings_all") || [];
  if (!all.includes(senderID)) {
    all.push(senderID);
    await setData(threadID + "_warnings_all", all);
  }

  // Get violator name
  const name = await getUserName(senderID, api);

  // Send warning as reply
  api.sendMessage(
    {
      body: formatWarning(name, violationType, note, warnings.count),
      mentions: [{ tag: `@${name}`, id: senderID }]
    },
    threadID,
    null,
    messageID
  );
};
