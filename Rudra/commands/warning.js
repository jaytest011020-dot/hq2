const { setData, getData } = require("../../database.js");

// CONFIG
const OWNER_UID = "61559999326713";
const MAX_DISPLAY_ADMINS = 5;
const WARN_LIMIT = 3;

// PROTECTED USERS (cannot be warned or kicked)
const PROTECTED_UIDS = [
  "61559999326713", // Jaylord (owner)
  "61554885397487", // Jandel Bot
  "61563731477181"  // Klenth
];

// Bad words & racist words (keep as in your previous list)
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
    if (info && info[uid] && info[uid].name) return info[uid].name;
    // sometimes getUserInfo returns array keyed differently; try fallback
    const firstKey = Object.keys(info || {})[0];
    if (firstKey && info[firstKey] && info[firstKey].name) return info[firstKey].name;
    return `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

function formatWarning(name, type, note, count) {
  return `╭━[⚠️ WARNING ISSUED]━╮
┃ 👤 User: ${name}
┃ 🚫 Violation: ${type}
┃ 📝 Note: ${note}
┃
┃ ⚠️ Current warning count: ${count}/${WARN_LIMIT}
╰━━━━━━━━━━━━━━━━━━╯`;
}

async function isAdmin(api, threadID, uid) {
  try {
    const info = await api.getThreadInfo(threadID);
    return info.adminIDs.some(a => a.id === uid);
  } catch {
    return false;
  }
}

// Add warning (shared by auto and manual)
async function addWarning(api, threadID, targetID, type, note, actorID, replyMessageID) {
  // protect checks
  const botID = api.getCurrentUserID();
  if (PROTECTED_UIDS.includes(targetID) || targetID === botID) {
    return api.sendMessage("🚫 You can't warn this protected member.", threadID, replyMessageID);
  }

  // fetch existing
  const dataPath = `warnings/${threadID}/${targetID}`;
  let warnings = (await getData(dataPath)) || { count: 0, reasons: [] };

  // reset daily? (old code had daily reset by lastUpdated) - keeping simple: no auto daily reset
  warnings.count = (warnings.count || 0) + 1;
  warnings.reasons = warnings.reasons || [];
  warnings.reasons.push({ type, note, by: actorID || "auto", time: Date.now() });

  await setData(dataPath, warnings);

  // maintain _all list
  const allPath = `warnings/${threadID}/_all`;
  let all = (await getData(allPath)) || [];
  if (!all.includes(targetID)) {
    all.push(targetID);
    await setData(allPath, all);
  }

  // prepare UI
  const name = await getUserName(targetID, api);

  // get admins for notification
  let threadInfo;
  try { threadInfo = await api.getThreadInfo(threadID); } catch { threadInfo = null; }
  const admins = (threadInfo && threadInfo.adminIDs) ? threadInfo.adminIDs.map(a => a.id).filter(id => id !== targetID) : [];
  const displayAdmins = admins.slice(0, MAX_DISPLAY_ADMINS);

  // build mentions array (target + displayed admins)
  const mentions = [{ tag: name, id: targetID }];
  for (const aid of displayAdmins) {
    const aname = await getUserName(aid, api);
    mentions.push({ tag: aname, id: aid });
  }

  // compose admin line (Taglish style)
  const adminNames = [];
  for (const aid of displayAdmins) adminNames.push(await getUserName(aid, api));
  const extra = admins.length - displayAdmins.length;
  const adminLine = adminNames.length ? adminNames.join(" | ") + (extra > 0 ? ` ... (+${extra} more)` : "") : "Walang admin para i-notify";

  // response message (boxed UI)
  let warningMsg = formatWarning(name, type, note, warnings.count);
  warningMsg += `\n\n📢 Notifying admins: ${adminLine}`;

  // send
  await api.sendMessage({ body: warningMsg, mentions }, threadID, null, replyMessageID);

  // Auto kick if reached limit
  if (warnings.count >= WARN_LIMIT) {
    try {
      await api.removeUserFromGroup(targetID, threadID);

      // Kick announcement UI
      const kickedMsg = `╭━[🚫 USER KICKED]━╮
┃ 👤 ${name}
┃ 🧾 Reason(s): ${warnings.reasons.map(r => r.type).join(", ")}
┃ ⚠️ Reached ${WARN_LIMIT} warnings — auto kick applied.
╰━━━━━━━━━━━━━━━━━━╯`;

      await api.sendMessage({ body: kickedMsg, mentions: [{ tag: name, id: targetID }] }, threadID);

      // reset that user's warnings
      await setData(dataPath, { count: 0, reasons: [] });

      // remove from _all
      const _all = (await getData(allPath)) || [];
      const idx = _all.indexOf(targetID);
      if (idx !== -1) {
        _all.splice(idx, 1);
        await setData(allPath, _all);
      }
    } catch (err) {
      console.error("Kick failed:", err);
      await api.sendMessage("⚠️ Failed to kick user. Bot may not have admin privileges.", threadID);
    }
  }
}

// EXPORT CONFIG
module.exports.config = {
  name: "warning",
  version: "6.0.0",
  hasPermission: 1,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Auto + manual warning system (reply or command) with UI, list, reset (per GC)",
  commandCategory: "system",
  usages: "/warning list | /warning reset all | /warning @mention reason (admin only). Or reply with 'warning reason'.",
  cooldowns: 3
};

// HANDLE EVENTS (auto detect + manual via reply)
module.exports.handleEvent = async function({ api, event }) {
  try {
    const { threadID, messageID, senderID, body, messageReply } = event;
    if (!body) return;

    const text = body.toString().trim();
    const lower = text.toLowerCase();
    const words = lower.replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);

    // ---------- MANUAL: reply + "warning" or "warn"
    if (messageReply && /^warn(ing)?\b/i.test(text)) {
      // only admins or owner
      const threadInfo = await api.getThreadInfo(threadID);
      const isGCAdmin = threadInfo.adminIDs.some(a => a.id === senderID);
      if (!isGCAdmin && senderID !== OWNER_UID) return;

      const targetID = messageReply.senderID;
      if (!targetID) return api.sendMessage("⚠️ Hindi ma-detect yung user na ni-replyan mo.", threadID, messageID);

      // protect
      const botID = api.getCurrentUserID();
      if (PROTECTED_UIDS.includes(targetID) || targetID === botID) {
        return api.sendMessage("🚫 Hindi pwedeng i-warn ang protected member.", threadID, messageID);
      }

      // parse reason (allow spaces)
      const parts = text.split(/\s+/);
      const reason = parts.slice(1).join(" ").trim();
      if (!reason) return api.sendMessage("⚠️ Please include a reason. Halimbawa: `warning spamming`", threadID, messageID);

      return await addWarning(api, threadID, targetID, "Manual Warning", reason, senderID, messageID);
    }

    // ---------- AUTO detection (badwords / racist / unauthorized links)
    // skip if sender is protected or bot itself
    const botID = api.getCurrentUserID();
    if (PROTECTED_UIDS.includes(senderID) || senderID === botID) return;

    const violations = [];
    if (badwords.some(w => words.includes(w))) {
      violations.push({ type: "Bad Language", note: pickRandom(messages.badword) });
    }
    if (racistWords.some(w => words.includes(w))) {
      violations.push({ type: "Racist/Discriminatory Term", note: pickRandom(messages.racist) });
    }
    if (/https?:\/\/|www\./i.test(lower)) {
      const allowed = allowedLinks.some(link => lower.includes(link));
      if (!allowed) violations.push({ type: "Unauthorized Link", note: pickRandom(messages.link) });
    }

    if (violations.length === 0) return;

    // for each violation, add warning
    for (const v of violations) {
      // actorID null for auto
      await addWarning(api, threadID, senderID, v.type, v.note, null, messageID);
    }
  } catch (err) {
    console.error("Warning handleEvent error:", err);
  }
};

// RUN (commands: list, reset all, manual via /warning @mention reason)
module.exports.run = async function({ api, event, args }) {
  try {
    const { threadID, messageID, senderID, mentions } = event;
    const sub = args[0]?.toLowerCase();

    // /warning list
    if (sub === "list") {
      const all = (await getData(`warnings/${threadID}/_all`)) || [];
      if (!all.length) return api.sendMessage("✅ Walang warnings sa GC na ito.", threadID, messageID);

      let msg = "📋 Mga may warnings sa GC:\n\n";
      for (const uid of all) {
        const data = (await getData(`warnings/${threadID}/${uid}`)) || { count: 0, reasons: [] };
        if (data.count > 0) {
          const name = await getUserName(uid, api);
          msg += `• ${name}: ${data.count} warning${data.count > 1 ? "s" : ""}\n`;
        }
      }
      return api.sendMessage(msg, threadID, messageID);
    }

    // /warning reset all
    if (sub === "reset" && args[1] === "all") {
      // only admins or owner
      const threadInfo = await api.getThreadInfo(threadID);
      const isGCAdmin = threadInfo.adminIDs.some(a => a.id === senderID);
      if (!isGCAdmin && senderID !== OWNER_UID) return api.sendMessage("🚫 Only admins or owner can reset warnings.", threadID, messageID);

      // reset all in this thread
      const all = (await getData(`warnings/${threadID}/_all`)) || [];
      for (const uid of all) {
        await setData(`warnings/${threadID}/${uid}`, { count: 0, reasons: [] });
      }
      // clear _all
      await setData(`warnings/${threadID}/_all`, []);
      return api.sendMessage("✅ Na-reset na lahat ng warnings sa GC na ito.", threadID, messageID);
    }

    // /warning @mention reason  (manual via command)
    // If mentions exist, use first mention
    if (mentions && Object.keys(mentions).length > 0) {
      // only admins or owner
      const threadInfo = await api.getThreadInfo(threadID);
      const isGCAdmin = threadInfo.adminIDs.some(a => a.id === senderID);
      if (!isGCAdmin && senderID !== OWNER_UID) return api.sendMessage("🚫 Only admins or owner can warn via command.", threadID, messageID);

      const mentionKeys = Object.keys(mentions);
      const targetID = mentionKeys[0];
      if (PROTECTED_UIDS.includes(targetID) || targetID === api.getCurrentUserID()) {
        return api.sendMessage("🚫 Hindi pwedeng i-warn ang protected member.", threadID, messageID);
      }

      const reason = args.slice(1).join(" ").trim();
      if (!reason) return api.sendMessage("⚠️ Please include a reason. Example: /warning @user spamming", threadID, messageID);

      return await addWarning(api, threadID, targetID, "Manual Warning", reason, senderID, messageID);
    }

    // If args[0] is UID and rest is reason: /warning 123456 reason...
    if (args[0] && /^\d+$/.test(args[0])) {
      const uid = args[0];
      const reason = args.slice(1).join(" ").trim();
      if (!reason) return api.sendMessage("⚠️ Please include a reason. Example: /warning 1000 spamming", threadID, messageID);

      // only admins or owner
      const threadInfo = await api.getThreadInfo(threadID);
      const isGCAdmin = threadInfo.adminIDs.some(a => a.id === senderID);
      if (!isGCAdmin && senderID !== OWNER_UID) return api.sendMessage("🚫 Only admins or owner can warn via command.", threadID, messageID);

      if (PROTECTED_UIDS.includes(uid) || uid === api.getCurrentUserID()) {
        return api.sendMessage("🚫 Hindi pwedeng i-warn ang protected member.", threadID, messageID);
      }
      return await addWarning(api, threadID, uid, "Manual Warning", reason, senderID, messageID);
    }

    // otherwise, show usage/help
    const help = `📘 Usage:
• Reply to a message with \`warning <reason>\` → admin only
• /warning @mention <reason> → admin only
• /warning <uid> <reason> → admin only
• /warning list
• /warning reset all (resets warnings only in THIS GC)`;
    return api.sendMessage(help, threadID, messageID);
  } catch (err) {
    console.error("Warning run error:", err);
  }
};