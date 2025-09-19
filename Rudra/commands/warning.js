const { setData, getData } = require("../../database.js");

// 📌 Configurable number of admins to display in text
const MAX_DISPLAY_ADMINS = 5;

// List of violations
const badwords = [
  "tanga", "bobo", "gago", "puta", "pakyu", "inutil", "ulol",
  "fuck", "shit", "asshole", "bitch", "dumb", "stupid", "motherfucker", "laplap", "pota", "inamo", "tangina", "tang ina", "kantut", "kantot", "jakol", "jakul", "jabol", "supot", "supot", "blow job", "blowjob", "puke", "puki", "baliw"
];
const racistWords = [
  "negro", "nigger", "chimp", "nigga", "baluga",
  "chink", "indio", "bakla", "niga", "bungal", "beki", "negra"
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
  return `╭━[⚠️WARNING ISSUED]━╮
┃ 👤 User: @${name}
┃ 🚫 Violation: ${type}
┃ 📝 Note: ${note}
┃
┃ ⚠️ Your current warning count: ${count}
╰━━━━━━━━━━━━━━━━━━╯`;
}

module.exports.config = {
  name: "warning",
  version: "3.0.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Auto warning system with per-thread DB + Admin notify",
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

    const warnings = await getData(`warnings/${threadID}/${uid}`) || { count: 0 };
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

    const all = await getData(`warnings/${threadID}/_all`) || [];
    for (const uid of all) {
      const warnings = await getData(`warnings/${threadID}/${uid}`);
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
  let warnings = await getData(`warnings/${threadID}/${senderID}`);
  if (!warnings) warnings = { count: 0 };

  warnings.count++;
  await setData(`warnings/${threadID}/${senderID}`, warnings);

  // Track sa list of warned users para sa /warning list
  let all = await getData(`warnings/${threadID}/_all`) || [];
  if (!all.includes(senderID)) {
    all.push(senderID);
    await setData(`warnings/${threadID}/_all`, all);
  }

  // Get violator name
  const name = await getUserName(senderID, api);

  // 🔔 Fetch admins
  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(a => a.id);
  const adminMentions = [];

  for (const id of adminIDs) {
    if (id !== senderID) {
      const adminName = await getUserName(id, api);
      adminMentions.push({ tag: `@${adminName}`, id });
    }
  }

  // Limit displayed admins (text only)
  let displayAdmins = adminMentions.slice(0, MAX_DISPLAY_ADMINS);
  let extraCount = adminMentions.length - displayAdmins.length;

  const adminLine =
    displayAdmins.map(m => m.tag).join(" | ") +
    (extraCount > 0 ? ` ... (+${extraCount} more)` : "");

  // Send warning with admin notification
  api.sendMessage(
    {
      body:
        formatWarning(name, violationType, note, warnings.count) +
        (adminMentions.length > 0
          ? `\n\n📢 Notifying admins: ${adminLine}`
          : ""),
      mentions: [{ tag: `@${name}`, id: senderID }, ...adminMentions]
    },
    threadID,
    null,
    messageID
  );
};
