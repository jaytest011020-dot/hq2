const { setData, getData } = require("../../database.js");

// Configurable number of admins to display
const MAX_DISPLAY_ADMINS = 5;

// List of violations
const badwords = [
  "tanga", "bobo", "gago", "puta", "pakyu", "inutil", "ulol",
  "fuck", "shit", "asshole", "bitch", "dumb", "stupid", "motherfucker",
  "laplap", "pota", "inamo", "tangina", "tang ina", "kantut", "kantot",
  "jakol", "jakul", "jabol", "supot", "blow job", "blowjob", "puke", "puki", "baliw"
];

const racistWords = [
  "negro", "nigger", "chimp", "nigga", "baluga",
  "chink", "indio", "bakla", "niga", "bungal", "beki", "negra"
];

const allowedLinks = [
  "facebook.com",
  "fb.com",
  "facebook.com/groups",
  "fb.com/groups",
  "m.me/j",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "roblox.com"
];

// Warning messages
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

// Helper: pick random message
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: fetch username
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    if (info && info[uid]?.name) return info[uid].name;
    return "User";
  } catch {
    return "User";
  }
}

// Format warning
function formatWarning(name, type, note, count) {
  return `╭━[⚠️ WARNING ISSUED]━╮
┃ 👤 User: ${name}
┃ 🚫 Violation: ${type}
┃ 📝 Note: ${note}
┃
┃ ⚠️ Your current warning count: ${count}
╰━━━━━━━━━━━━━━━━━━╯`;
}

// Module config
module.exports.config = {
  name: "warning",
  version: "3.0.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Auto warning system with per-thread DB + Admin notify",
  commandCategory: "system",
  usages: `
📌 /warning list
   - View warning list for the thread (anyone can use)

⚠️ /warning reset all
   - Reset warnings for all users (ADMIN ONLY)

⚠️ /warning reset @mention
   - Reset warnings for mentioned user(s) (ADMIN ONLY)
`,
  cooldowns: 5
};

// Helper to send help text
const sendHelp = async (api, threadID, messageID) => {
  return api.sendMessage(module.exports.config.usages, threadID, messageID);
};

// COMMANDS: /warning list, reset
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, mentions, senderID } = event;

  // If no arguments, show help
  if (!args.length) return sendHelp(api, threadID, messageID);

  const sub = args[0].toLowerCase();

  // Check if sender is admin
  const isAdmin = async () => {
    const threadInfo = await api.getThreadInfo(threadID);
    return threadInfo.adminIDs.some(a => a.id === senderID);
  };

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

  // /warning reset
  if (sub === "reset") {
    if (!(await isAdmin())) {
      return api.sendMessage("❌ Only admins can reset warnings.", threadID, messageID);
    }

    const nextArg = args[1]?.toLowerCase();

    // Reset all warnings
    if (nextArg === "all") {
      const all = await getData(`warnings/${threadID}/_all`) || [];
      for (const uid of all) {
        await setData(`warnings/${threadID}/${uid}`, { count: 0, lastUpdated: Date.now() });
      }
      return api.sendMessage("✅ All warnings have been reset for this thread.", threadID, messageID);
    }

    // Reset mentioned user(s)
    const uids = Object.keys(mentions);
    if (uids.length > 0) {
      for (const uid of uids) {
        await setData(`warnings/${threadID}/${uid}`, { count: 0, lastUpdated: Date.now() });
      }
      const names = await Promise.all(uids.map(uid => getUserName(uid, api)));
      return api.sendMessage(`✅ Reset warnings for: ${names.join(", ")}`, threadID, messageID);
    }

    // Invalid usage
    return sendHelp(api, threadID, messageID);
  }

  // Invalid subcommand
  return sendHelp(api, threadID, messageID);
};

// AUTO-DETECTION + AUTO-KICK + 24H RESET
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body) return;

  const text = body.toLowerCase();
  const words = text.replace(/[^\w\s]/g, "").split(/\s+/);

  let violationType = null;
  let note = "";

  // Detect badwords
  if (badwords.some(word => words.includes(word))) {
    violationType = "Bad Language";
    note = pickRandom(messages.badword);
  }

  // Detect racist words
  if (racistWords.some(word => words.includes(word))) {
    violationType = "Racist/Discriminatory Term";
    note = pickRandom(messages.racist);
  }

  // Detect unauthorized links
  if (/https?:\/\/|www\./.test(text)) {
    const isAllowed = allowedLinks.some(link => text.includes(link));
    if (!isAllowed) {
      violationType = "Unauthorized Link";
      note = pickRandom(messages.link);
    }
  }

  if (!violationType) return;

  // Get and update warnings
  let warnings = await getData(`warnings/${threadID}/${senderID}`);
  if (!warnings) warnings = { count: 0, lastUpdated: Date.now() };

  // Auto-reset every 24 hours
  if (Date.now() - warnings.lastUpdated >= 24 * 60 * 60 * 1000) {
    warnings.count = 0;
  }

  // Increment count and update timestamp
  warnings.count++;
  warnings.lastUpdated = Date.now();
  await setData(`warnings/${threadID}/${senderID}`, warnings);

  // Track warned users
  let all = await getData(`warnings/${threadID}/_all`) || [];
  if (!all.includes(senderID)) {
    all.push(senderID);
    await setData(`warnings/${threadID}/_all`, all);
  }

  const name = await getUserName(senderID, api);

  // Fetch admins
  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(a => a.id);
  const adminMentions = [];

  for (const id of adminIDs) {
    if (id !== senderID) {
      const adminName = await getUserName(id, api);
      adminMentions.push({ tag: `@${adminName}`, id });
    }
  }

  const displayAdmins = adminMentions.slice(0, MAX_DISPLAY_ADMINS);
  const extraCount = adminMentions.length - displayAdmins.length;
  const adminLine =
    displayAdmins.map(m => m.tag).join(" | ") +
    (extraCount > 0 ? ` ... (+${extraCount} more)` : "");

  // Format warning
  let warningNote = formatWarning(name, violationType, note, warnings.count);

  // Auto-kick message if 5 warnings reached
  if (warnings.count >= 5) {
    warningNote += "\n\n⚠️ You have reached 5 warnings. Auto Kick will be applied!";
  }

  // Send warning
  api.sendMessage(
    {
      body:
        warningNote +
        (adminMentions.length > 0
          ? `\n\n📢 Notifying admins: ${adminLine}`
          : ""),
      mentions: [{ tag: name, id: senderID }, ...adminMentions]
    },
    threadID,
    null,
    messageID
  );

  // Auto-kick at 5 warnings
  if (warnings.count >= 5) {
    try {
      await api.removeUserFromGroup(threadID, senderID);
      await api.sendMessage(
        `⚠️ User @${name} has been removed from the group due to 5 warnings.`,
        threadID,
        null,
        messageID,
        { mentions: [{ tag: name, id: senderID }] }
      );

      // Reset warnings after kick
      await setData(`warnings/${threadID}/${senderID}`, { count: 0, lastUpdated: Date.now() });
    } catch (err) {
      console.error("Failed to kick user:", err);
    }
  }
};
