const { setData, getData } = require("../../database.js");

// Helper: parse duration
function parseDuration(str) {
  const match = str.match(/(\d+)([mhd])/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  if (unit === "m") return num * 60 * 1000;
  if (unit === "h") return num * 60 * 60 * 1000;
  if (unit === "d") return num * 24 * 60 * 60 * 1000;
  return null;
}

// Format time left
function formatTime(ms) {
  if (ms <= 0) return "0s";
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${day > 0 ? day + "d " : ""}${hr > 0 ? hr + "h " : ""}${min > 0 ? min + "m " : ""}${sec}s`;
}

// Get user name safely
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    return info?.[uid]?.name || `User(${uid})`;
  } catch {
    return `User(${uid})`;
  }
}

// Pick random winner
async function endGiveaway(api, threadID, force = false) {
  const giveaway = await getData(`/giveaway/${threadID}`);
  if (!giveaway) return;

  if (!force && Date.now() < giveaway.endTime) return;

  let winnerText = "⚠️ Walang sumali sa giveaway.";
  if (giveaway.participants.length > 0) {
    const winner = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
    const winnerName = await getUserName(winner, api);
    winnerText = `🏆 Winner: ${winnerName}\n👤 UID: ${winner}`;
  }

  api.sendMessage(
`╭━[GIVEAWAY ENDED]━╮
┃ 🏆 Prize: ${giveaway.prize}
┃ 👥 Participants: ${giveaway.participants.length}
┃ 
┃ ${winnerText}
╰━━━━━━━━━━━━━━━╯`,
    threadID
  );

  await setData(`/giveaway/${threadID}`, null);
}

module.exports.config = {
  name: "giveaway",
  version: "2.1.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Giveaway system with join, list, resend, roll",
  commandCategory: "group",
  usages: "/giveaway <prize> <time> | list | resend | roll",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const ownerID = "61559999326713"; // bot owner UID

  const info = await api.getThreadInfo(threadID);
  const isAdmin = info.adminIDs.some(a => a.id === senderID);

  if (senderID !== ownerID && !isAdmin) {
    return api.sendMessage("❌ Only group admins or the bot owner can use this command.", threadID, messageID);
  }

  if (!args[0]) {
    return api.sendMessage("❌ Usage: /giveaway <prize> <time> | list | resend | roll", threadID, messageID);
  }

  const sub = args[0].toLowerCase();
  let giveawayData = await getData(`/giveaway/${threadID}`);

  // LIST participants
  if (sub === "list") {
    if (!giveawayData) return api.sendMessage("⚠️ Walang active giveaway.", threadID, messageID);

    let names = [];
    for (const uid of giveawayData.participants) {
      names.push(await getUserName(uid, api));
    }

    return api.sendMessage(
`╭━[GIVEAWAY PARTICIPANTS]━╮
┃ 🏆 Prize: ${giveawayData.prize}
┃ 👥 Total: ${giveawayData.participants.length}
┃ 
${names.length ? names.map((n, i) => `┃ ${i+1}. ${n}`).join("\n") : "┃ ⚠️ Wala pang sumasali."}
╰━━━━━━━━━━━━━━━╯`,
      threadID,
      messageID
    );
  }

  // RESEND giveaway status
  if (sub === "resend") {
    if (!giveawayData) return api.sendMessage("⚠️ Walang active giveaway.", threadID, messageID);

    const remaining = giveawayData.endTime - Date.now();
    const sent = await api.sendMessage(
`╭━[GIVEAWAY ONGOING]━╮
┃ 🏆 Prize: ${giveawayData.prize}
┃ 👥 Participants: ${giveawayData.participants.length}
┃ ⏳ Time left: ${formatTime(remaining)}
┃ 
┃ 👉 Reply to this message to join!
╰━━━━━━━━━━━━━━━╯`,
      threadID
    );

    giveawayData.msgID = sent.messageID;
    await setData(`/giveaway/${threadID}`, giveawayData);
    return;
  }

  // ROLL to end early
  if (sub === "roll") {
    if (!giveawayData) return api.sendMessage("⚠️ Walang active giveaway.", threadID, messageID);
    await endGiveaway(api, threadID, true);
    return;
  }

  // START giveaway
  if (giveawayData) {
    return api.sendMessage("⚠️ May active giveaway pa. Gamitin /giveaway roll para tapusin muna.", threadID, messageID);
  }

  if (args.length < 2) {
    return api.sendMessage("❌ Usage: /giveaway <prize> <time>\nExample: /giveaway 1 Golden Raccoon 1h", threadID, messageID);
  }

  const prize = args.slice(0, -1).join(" ");
  const duration = parseDuration(args[args.length - 1]);
  if (!duration) return api.sendMessage("❌ Invalid time. Use 1m, 1h, or 1d.", threadID, messageID);

  const endTime = Date.now() + duration;

  giveawayData = {
    prize,
    endTime,
    participants: [],
    msgID: null
  };

  const sent = await api.sendMessage(
`╭━[GIVEAWAY STARTED]━╮
┃ 🏆 Prize: ${prize}
┃ ⏳ Ends in: ${formatTime(duration)}
┃ 👥 Participants: 0
┃ 
┃ 👉 Reply to this message to join!
╰━━━━━━━━━━━━━━━╯`,
    threadID
  );

  giveawayData.msgID = sent.messageID;
  await setData(`/giveaway/${threadID}`, giveawayData);

  // Auto end
  setTimeout(() => endGiveaway(api, threadID), duration);
};

// Handle replies to join
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID, type, messageReply } = event;
  if (type !== "message" || !messageReply) return;

  let giveawayData = await getData(`/giveaway/${threadID}`);
  if (!giveawayData) return;

  // Only if reply to giveaway message
  if (messageReply.messageID !== giveawayData.msgID) return;

  if (!giveawayData.participants.includes(senderID)) {
    giveawayData.participants.push(senderID);
    await setData(`/giveaway/${threadID}`, giveawayData);

    const name = await getUserName(senderID, api);
    api.sendMessage(
`✅ Nakajoin ka na sa giveaway, ${name}! 🎉`,
      threadID,
      undefined,
      undefined,
      senderID
    );
  } else {
    api.sendMessage("⚠️ Nakajoin ka na dati dito!", threadID);
  }
};
