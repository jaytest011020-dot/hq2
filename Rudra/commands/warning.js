const { setData, getData } = require("../../database.js");

// CONFIG
const MAX_DISPLAY_ADMINS = 5;
const WARN_LIMIT = 3;

// PROTECTED USERS (cannot be warned or kicked)
const PROTECTED_UIDS = [
  "61559999326713", // Jaylord
  "61554885397487", // Jandel Bot
  "61563731477181"  // Klenth
];

// Bad words
const badwords = [
  "tanga","bobo","gago","puta","pakyu","inutil","ulol",
  "fuck","shit","asshole","bitch","dumb","stupid","motherfucker",
  "laplap","pota","inamo","tangina","tang ina","kantut","kantot",
  "jakol","jakul","jabol","supot","blow job","blowjob","puke","puki"
];

const racistWords = [
  "negro","nigger","chimp","nigga","baluga",
  "chink","indio","bakla","niga","bungal","beki","negra"
];

// Allowed links
const allowedLinks = [
  "facebook.com","fb.com","facebook.com/groups","fb.com/groups",
  "m.me/j","tiktok.com","youtube.com","youtu.be","roblox.com"
];

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

// Helpers
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    if (info && info[uid]?.name) return info[uid].name;
    return "User";
  } catch { return "User"; }
}

function formatWarning(name, type, note, count) {
  return `╭━[⚠️ WARNING ISSUED]━╮
┃ 👤 User: ${name}
┃ 🚫 Violation: ${type}
┃ 📝 Note: ${note}
┃
┃ ⚠️ Current warning count: ${count}
╰━━━━━━━━━━━━━━━━━━╯`;
}

async function isAdmin(api, threadID, senderID) {
  const info = await api.getThreadInfo(threadID);
  return info.adminIDs.some(a => a.id === senderID);
}

// MODULE CONFIG
module.exports.config = {
  name: "warning",
  version: "5.0.0",
  hasPermission: 1,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Automatic + manual warning system with admin notify + auto kick + protected users",
  commandCategory: "system",
  cooldowns: 5
};

// ⚙️ HANDLE EVENTS (Auto detect + Manual warning)
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, messageID, senderID, body, messageReply } = event;
  if (!body) return;

  const text = body.toLowerCase().trim();
  const words = text.replace(/[^\w\s]/g, "").split(/\s+/);

  // 🧩 MANUAL WARNING (reply + "warning" keyword)
  if (messageReply && (text.startsWith("warning") || text.startsWith("warn"))) {
    const threadInfo = await api.getThreadInfo(threadID);
    const isGCAdmin = threadInfo.adminIDs.some(a => a.id === senderID);
    if (!isGCAdmin && senderID !== "61559999326713") return; // Only admins or owner can warn

    const targetID = messageReply.senderID;
    if (PROTECTED_UIDS.includes(targetID) || targetID === api.getCurrentUserID())
      return api.sendMessage("🚫 You cannot warn this protected member.", threadID, messageID);

    const reason = body.split(" ").slice(1).join(" ") || "No reason provided.";
    await addWarning(api, threadID, targetID, "Manual Warning", reason, senderID, messageID);
    return;
  }

  // 🧩 AUTO WARNING CHECK
  const violations = [];
  if (badwords.some(w => words.includes(w)))
    violations.push({ type: "Bad Language", note: pickRandom(messages.badword) });
  if (racistWords.some(w => words.includes(w)))
    violations.push({ type: "Racist/Discriminatory Term", note: pickRandom(messages.racist) });
  if (/https?:\/\/|www\./.test(text)) {
    const allowed = allowedLinks.some(link => text.includes(link));
    if (!allowed) violations.push({ type: "Unauthorized Link", note: pickRandom(messages.link) });
  }

  if (!violations.length) return;
  if (PROTECTED_UIDS.includes(senderID) || senderID === api.getCurrentUserID()) return;

  for (const v of violations) {
    await addWarning(api, threadID, senderID, v.type, v.note, null, messageID);
  }
};

// ⚠️ ADD WARNING FUNCTION (shared by auto + manual)
async function addWarning(api, threadID, targetID, type, note, fromID, messageID) {
  let warnings = await getData(`warnings/${threadID}/${targetID}`) || { count: 0, reasons: [] };
  warnings.count++;
  warnings.reasons.push({ type, note, time: Date.now() });
  await setData(`warnings/${threadID}/${targetID}`, warnings);

  let all = await getData(`warnings/${threadID}/_all`) || [];
  if (!all.includes(targetID)) {
    all.push(targetID);
    await setData(`warnings/${threadID}/_all`, all);
  }

  const name = await getUserName(targetID, api);
  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(a => a.id);
  const displayAdmins = adminIDs.slice(0, MAX_DISPLAY_ADMINS);
  const extraCount = adminIDs.length - displayAdmins.length;
  const adminLine =
    displayAdmins.map(a => `@${(threadInfo.userInfo.find(u => u.id === a)?.name) || "Admin"}`).join(" | ") +
    (extraCount > 0 ? ` ... (+${extraCount} more)` : "");

  let warningMsg = formatWarning(name, type, note, warnings.count);
  if (warnings.count >= WARN_LIMIT) warningMsg += `\n\n🚨 ${name} has reached ${WARN_LIMIT} warnings and will be kicked.`;

  await api.sendMessage(
    {
      body: `${warningMsg}\n\n📢 Notifying admins: ${adminLine}`,
      mentions: [{ tag: name, id: targetID }]
    },
    threadID,
    null,
    messageID
  );

  // 🦶 AUTO KICK
  if (warnings.count >= WARN_LIMIT) {
    try {
      await api.removeUserFromGroup(targetID, threadID);
      await api.sendMessage(
        `🚨 ${name} has been auto-kicked after reaching ${WARN_LIMIT} warnings.`,
        threadID
      );
      await setData(`warnings/${threadID}/${targetID}`, { count: 0, reasons: [] });
    } catch (err) {
      console.error("Kick failed:", err);
      api.sendMessage("⚠️ Failed to kick user. Check bot admin permissions.", threadID);
    }
  }
}

// 📋 CHECK WARNING LIST COMMAND
module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;
  const all = await getData(`warnings/${threadID}/_all`) || [];
  if (!all.length) return api.sendMessage("✅ No warnings in this thread.", threadID, messageID);

  let msg = "📋 Warning List:\n\n";
  for (const uid of all) {
    const data = await getData(`warnings/${threadID}/${uid}`);
    if (data && data.count > 0) {
      const name = await getUserName(uid, api);
      msg += `• ${name}: ${data.count} warning${data.count > 1 ? "s" : ""}\n`;
    }
  }

  api.sendMessage(msg, threadID, messageID);
};