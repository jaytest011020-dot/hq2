const fs = require("fs");
const path = require("path");

const cleanerFile = path.join(__dirname, "cleaner.json");
if (!fs.existsSync(cleanerFile)) fs.writeFileSync(cleanerFile, JSON.stringify({}, null, 2), "utf8");

function loadCleaners() {
  try {
    return JSON.parse(fs.readFileSync(cleanerFile, "utf8"));
  } catch {
    return {};
  }
}
function saveCleaners(data) {
  fs.writeFileSync(cleanerFile, JSON.stringify(data, null, 2), "utf8");
}

function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "s") return val * 1000;
  if (unit === "m") return val * 60 * 1000;
  if (unit === "h") return val * 60 * 60 * 1000;
  if (unit === "d") return val * 24 * 60 * 60 * 1000;
  return null;
}

module.exports.config = {
  name: "cleaner",
  version: "3.3.0",
  hasPermission: 1,
  credits: "ChatGPT Fix",
  description: "Active poll system with auto-kick + background checker",
  commandCategory: "system",
  usages: "/cleaner <time> | /cleaner cancel | /cleaner resend | /cleaner list",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Threads }) {
  const { threadID, messageID } = event;
  let cleaners = loadCleaners();
  if (!cleaners[threadID]) cleaners[threadID] = null;

  const sub = args[0]?.toLowerCase();

  // cancel poll
  if (sub === "cancel") {
    if (!cleaners[threadID]) return api.sendMessage("⚠️ No active poll to cancel.", threadID, messageID);
    cleaners[threadID] = null;
    saveCleaners(cleaners);
    return api.sendMessage("✅ Active poll has been cancelled. You can now create a new one.", threadID, messageID);
  }

  // resend poll
  if (sub === "resend") {
    if (!cleaners[threadID]) return api.sendMessage("⚠️ No active poll to resend.", threadID, messageID);
    const poll = cleaners[threadID];
    return api.sendMessage(
      `🧹 Active User Poll 🧹\n⏳ Ends: ${new Date(poll.end).toLocaleString()}\n✅ ${poll.activeUsers.length}/${poll.totalUsers} marked active.\n\nReply "active" to this message to stay in the group.`,
      threadID,
      (err, info) => {
        if (!err) {
          poll.postID = info.messageID;
          saveCleaners(cleaners);
        }
      }
    );
  }

  // list polls
  if (sub === "list") {
    if (!cleaners[threadID]) return api.sendMessage("⚠️ No active poll for this GC.", threadID, messageID);
    const poll = cleaners[threadID];
    return api.sendMessage(
      `📝 Active Poll Info:\n⏳ Ends: ${new Date(poll.end).toLocaleString()}\n✅ ${poll.activeUsers.length}/${poll.totalUsers} marked active.`,
      threadID,
      messageID
    );
  }

  // start poll
  const duration = parseDuration(args[0]);
  if (!duration) {
    return api.sendMessage("❌ Invalid usage. Example: /cleaner 3m | /cleaner 1h | /cleaner 1d", threadID, messageID);
  }
  if (cleaners[threadID]) {
    return api.sendMessage("⚠️ There is already an active poll. Use /cleaner cancel first.", threadID, messageID);
  }

  const threadInfo = await Threads.getInfo(threadID);
  const members = threadInfo.participantIDs || [];
  const endTime = Date.now() + duration;

  const newPoll = {
    postID: null,
    activeUsers: [],
    totalUsers: members.length,
    end: endTime,
    done: false,
  };

  cleaners[threadID] = newPoll;
  saveCleaners(cleaners);

  return api.sendMessage(
    `🧹 Active User Poll 🧹\n⏳ Ends in: ${args[0]}\n📅 End Date: ${new Date(endTime).toLocaleString()}\n✅ 0/${members.length} marked active.\n\nReply "active" to THIS message to stay in the group.\n⚠️ Inactive users will be auto-kicked.`,
    threadID,
    (err, info) => {
      if (!err) {
        newPoll.postID = info.messageID;
        saveCleaners(cleaners);
      }
    }
  );
};

// Handle replies
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body, messageReply } = event;
  if (!body) return;
  let cleaners = loadCleaners();
  const poll = cleaners[threadID];
  if (!poll || !messageReply) return;

  // reply "active"
  if (messageReply.messageID === poll.postID && body.toLowerCase().trim() === "active") {
    if (!poll.activeUsers.includes(senderID)) {
      poll.activeUsers.push(senderID);
      saveCleaners(cleaners);

      api.sendMessage(
        `🧹 Active User Poll (Updated)\n✅ ${poll.activeUsers.length}/${poll.totalUsers} marked active.\n\nReply "active" to THIS message to stay in the group.`,
        threadID,
        (err, info) => {
          if (!err) {
            poll.postID = info.messageID; // update latest poll post
            saveCleaners(cleaners);
          }
        }
      );
    }
  }
};

// Background auto-checker (runs every 60s)
setInterval(async () => {
  const cleaners = loadCleaners();
  for (const threadID in cleaners) {
    const poll = cleaners[threadID];
    if (!poll || poll.done) continue;

    if (Date.now() >= poll.end) {
      poll.done = true;
      saveCleaners(cleaners);

      try {
        const threadInfo = await global.api.getThreadInfo(threadID);
        const inactive = threadInfo.participantIDs.filter(u => !poll.activeUsers.includes(u));

        for (const uid of inactive) {
          try {
            await global.api.removeUserFromGroup(uid, threadID);
          } catch (e) {}
        }

        global.api.sendMessage(
          `⏰ Poll ended!\n✅ Active: ${poll.activeUsers.length}\n❌ Kicked: ${inactive.length}`,
          threadID
        );
      } catch (err) {
        console.error("Cleaner auto-check error:", err);
      }
    }
  }
}, 60 * 1000);
