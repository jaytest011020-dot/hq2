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

// Generate random giveaway ID
function genID() {
  return "G" + Math.floor(1000 + Math.random() * 9000);
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

// End giveaway
async function endGiveaway(api, threadID, id, force = false) {
  let giveaways = (await getData(`/giveaway/${threadID}`)) || {};
  const giveaway = giveaways[id];
  if (!giveaway) return;

  if (!force && Date.now() < giveaway.endTime) return;

  let winnerText = "⚠️ Walang sumali sa giveaway.";
  if (giveaway.participants.length > 0) {
    const winner = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
    const winnerName = await getUserName(winner, api);
    winnerText = `🏆 Winner: ${winnerName}\n👤 UID: ${winner}`;
  }

  api.sendMessage(
`╭━🎉[GIVEAWAY ENDED]🎉━╮
┃ 🏆 Prize: ${giveaway.prize}
┃ 👥 Participants: ${giveaway.participants.length}
┃ 👑 Host: ${giveaway.hostName} (${giveaway.hostID})
┃ 🆔 ID: ${id}
┃ 
┃ ${winnerText}
╰━━━━━━━━━━━━━━━╯`,
    threadID
  );

  delete giveaways[id];
  await setData(`/giveaway/${threadID}`, giveaways);
}

module.exports.config = {
  name: "giveaway",
  version: "3.0.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Multiple giveaways system with join, list, resend, roll",
  commandCategory: "group",
  usages: "/giveaway <prize> <time> | list <id> | resend <id> | roll <id>",
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
    return api.sendMessage("❌ Usage: /giveaway <prize> <time> | list <id> | resend <id> | roll <id>", threadID, messageID);
  }

  const sub = args[0].toLowerCase();
  let giveaways = (await getData(`/giveaway/${threadID}`)) || {};

  // LIST participants
  if (sub === "list") {
    const id = args[1];
    if (!id || !giveaways[id]) return api.sendMessage("⚠️ Invalid or no giveaway ID found.", threadID, messageID);

    const giveaway = giveaways[id];
    let names = [];
    for (const uid of giveaway.participants) {
      names.push(await getUserName(uid, api));
    }

    return api.sendMessage(
`╭━[GIVEAWAY PARTICIPANTS]━╮
┃ 🏆 Prize: ${giveaway.prize}
┃ 👑 Host: ${giveaway.hostName}
┃ 🆔 ID: ${id}
┃ 👥 Total: ${giveaway.participants.length}
┃ 
${names.length ? names.map((n, i) => `┃ ${i+1}. ${n}`).join("\n") : "┃ ⚠️ Wala pang sumasali."}
╰━━━━━━━━━━━━━━━╯`,
      threadID,
      messageID
    );
  }

  // RESEND giveaway status
  if (sub === "resend") {
    const id = args[1];
    if (!id || !giveaways[id]) return api.sendMessage("⚠️ Invalid or no giveaway ID found.", threadID, messageID);

    const giveaway = giveaways[id];
    const remaining = giveaway.endTime - Date.now();
    const sent = await api.sendMessage(
`╭━[GIVEAWAY ONGOING]━╮
┃ 🏆 Prize: ${giveaway.prize}
┃ 👥 Participants: ${giveaway.participants.length}
┃ ⏳ Time left: ${formatTime(remaining)}
┃ 👑 Host: ${giveaway.hostName}
┃ 🆔 ID: ${id}
┃ 
┃ 👉 Reply to this message to join!
╰━━━━━━━━━━━━━━━╯`,
      threadID
    );

    giveaway.msgID = sent.messageID;
    giveaways[id] = giveaway;
    await setData(`/giveaway/${threadID}`, giveaways);
    return;
  }

  // ROLL to end early
  if (sub === "roll") {
    const id = args[1];
    if (!id || !giveaways[id]) return api.sendMessage("⚠️ Invalid or no giveaway ID found.", threadID, messageID);
    await endGiveaway(api, threadID, id, true);
    return;
  }

  // START giveaway
  if (args.length < 2) {
    return api.sendMessage("❌ Usage: /giveaway <prize> <time>\nExample: /giveaway 1 Golden Raccoon 1h", threadID, messageID);
  }

  const prize = args.slice(0, -1).join(" ");
  const duration = parseDuration(args[args.length - 1]);
  if (!duration) return api.sendMessage("❌ Invalid time. Use 1m, 1h, or 1d.", threadID, messageID);

  const endTime = Date.now() + duration;
  const id = genID();
  const hostName = await getUserName(senderID, api);

  giveaways[id] = {
    prize,
    endTime,
    participants: [],
    msgID: null,
    hostID: senderID,
    hostName
  };

  const sent = await api.sendMessage(
`╭━🎉[GIVEAWAY STARTED]🎉━╮
┃ 🏆 Prize: ${prize}
┃ ⏳ Ends in: ${formatTime(duration)}
┃ 👥 Participants: 0
┃ 👑 Host: ${hostName} (${senderID})
┃ 🆔 ID: ${id}
┃ 
┃ 👉 Reply to this message to join!
╰━━━━━━━━━━━━━━━╯`,
    threadID
  );

  giveaways[id].msgID = sent.messageID;
  await setData(`/giveaway/${threadID}`, giveaways);

  // Auto end
  setTimeout(() => endGiveaway(api, threadID, id), duration);
};

// Handle replies to join
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID, type, messageReply } = event;
  if (type !== "message" || !messageReply) return;

  let giveaways = (await getData(`/giveaway/${threadID}`)) || {};
  const entry = Object.entries(giveaways).find(([id, g]) => g.msgID === messageReply.messageID);
  if (!entry) return;

  const [id, giveaway] = entry;

  if (!giveaway.participants.includes(senderID)) {
    giveaway.participants.push(senderID);
    giveaways[id] = giveaway;
    await setData(`/giveaway/${threadID}`, giveaways);

    const name = await getUserName(senderID, api);
    api.sendMessage(`✅ Nakajoin ka na sa giveaway **${id}**, ${name}! 🎉`, threadID);
  } else {
    api.sendMessage("⚠️ Nakajoin ka na dati dito!", threadID);
  }
};
