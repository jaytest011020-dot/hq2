const { getData, setData } = require("../../database.js"); // <- path fix (database.js nasa root)

module.exports.config = {
  name: "giveaway",
  version: "1.0",
  hasPermission: 1, // admin/owner lang makaka-start
  credits: "ChatGPT + NN",
  description: "Giveaway system with host, ID, roll, and resend",
  commandCategory: "group",
  usages: "/giveaway <prize> <duration>\n/giveaway resend <ID>\n/giveaway roll <ID>",
  cooldowns: 5
};

function formatTime(ms) {
  let s = Math.floor(ms / 1000);
  let m = Math.floor(s / 60);
  let h = Math.floor(m / 60);
  s %= 60;
  m %= 60;
  return `${h > 0 ? h + "h " : ""}${m > 0 ? m + "m " : ""}${s}s`;
}

function randomID() {
  return "G" + Math.floor(1000 + Math.random() * 9000);
}

async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    return info?.[uid]?.name || "Unknown";
  } catch {
    return "Unknown";
  }
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, isGroup } = event;
  if (!isGroup) return api.sendMessage("❌ Group lang puwede.", threadID);

  let giveaways = (await getData(`/giveaway/${threadID}`)) || {};

  // ─── RESEND ──────────────────────────────
  if (args[0] === "resend") {
    const gid = args[1];
    const giveaway = giveaways[gid];
    if (!giveaway) return api.sendMessage("⚠️ Walang giveaway na ganyan.", threadID);

    // delete old message kung meron
    if (giveaway.currentMsgID) {
      try { await api.unsendMessage(giveaway.currentMsgID); } catch (e) {}
    }

    const remaining = giveaway.endTime - Date.now();
    const sent = await api.sendMessage(
`╭━🎉[GIVEAWAY ONGOING]🎉━╮
┃ 🏆 Prize: ${giveaway.prize}
┃ 👥 Participants: ${giveaway.participants.length}
┃ 👑 Host: ${giveaway.hostName} (${giveaway.hostID})
┃ ⏳ Time left: ${formatTime(remaining)}
┃ 🆔 ID: ${gid}
┃ 
┃ 👉 Reply to this message to join!
╰━━━━━━━━━━━━━━━╯`,
      threadID
    );

    giveaway.currentMsgID = sent.messageID;
    giveaways[gid] = giveaway;
    await setData(`/giveaway/${threadID}`, giveaways);
    return;
  }

  // ─── ROLL WINNER ──────────────────────────────
  if (args[0] === "roll") {
    const gid = args[1];
    const giveaway = giveaways[gid];
    if (!giveaway) return api.sendMessage("⚠️ Walang giveaway na ganyan.", threadID);

    if (giveaway.participants.length === 0) {
      delete giveaways[gid];
      await setData(`/giveaway/${threadID}`, giveaways);
      return api.sendMessage("😢 Walang participants sa giveaway na ito.", threadID);
    }

    const winnerID = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
    const winnerName = await getUserName(winnerID, api);

    // delete current message first kung meron
    if (giveaway.currentMsgID) {
      try { await api.unsendMessage(giveaway.currentMsgID); } catch (e) {}
    }

    await api.sendMessage(
`╭━🎊[GIVEAWAY ENDED]🎊━╮
┃ 🏆 Prize: ${giveaway.prize}
┃ 👑 Host: ${giveaway.hostName} (${giveaway.hostID})
┃ 🥳 Winner: ${winnerName} (${winnerID})
┃ 🆔 ID: ${gid}
╰━━━━━━━━━━━━━━━╯`,
      threadID
    );

    delete giveaways[gid];
    await setData(`/giveaway/${threadID}`, giveaways);
    return;
  }

  // ─── START GIVEAWAY ──────────────────────────
  const durationArg = args.pop();
  const prize = args.join(" ");
  if (!prize || !durationArg) {
    return api.sendMessage("❌ Usage: /giveaway <prize> <time>\nEx: /giveaway 100 Coins 5m", threadID);
  }

  // parse duration (ex: 5m, 2h, 30s)
  const match = durationArg.match(/(\d+)([smh])/);
  if (!match) return api.sendMessage("❌ Invalid duration. Gamitin s|m|h (e.g. 30s, 5m, 1h)", threadID);
  let time = parseInt(match[1]);
  let unit = match[2];
  let ms = unit === "s" ? time * 1000 : unit === "m" ? time * 60000 : time * 3600000;

  const gid = randomID();
  const hostName = await getUserName(senderID, api);

  const giveaway = {
    prize,
    hostName,
    hostID: senderID,
    participants: [],
    endTime: Date.now() + ms,
    currentMsgID: null
  };

  // send first message
  const sent = await api.sendMessage(
`╭━🎉[GIVEAWAY STARTED]🎉━╮
┃ 🏆 Prize: ${giveaway.prize}
┃ 👑 Host: ${giveaway.hostName} (${giveaway.hostID})
┃ ⏳ Ends in: ${formatTime(ms)}
┃ 👥 Participants: 0
┃ 🆔 ID: ${gid}
┃ 
┃ 👉 Reply to this message to join!
╰━━━━━━━━━━━━━━━╯`,
    threadID
  );

  giveaway.currentMsgID = sent.messageID;
  giveaways[gid] = giveaway;
  await setData(`/giveaway/${threadID}`, giveaways);

  // auto roll kapag tapos na
  setTimeout(async () => {
    let giveawaysNow = (await getData(`/giveaway/${threadID}`)) || {};
    let gw = giveawaysNow[gid];
    if (!gw) return;

    if (gw.participants.length === 0) {
      // delete current message first kung meron
      if (gw.currentMsgID) {
        try { await api.unsendMessage(gw.currentMsgID); } catch (e) {}
      }
      await api.sendMessage(
`╭━😢[GIVEAWAY ENDED]😢━╮
┃ 🏆 Prize: ${gw.prize}
┃ 👑 Host: ${gw.hostName} (${gw.hostID})
┃ ❗ Result: Walang sumali
┃ 🆔 ID: ${gid}
╰━━━━━━━━━━━━━━━╯`,
        threadID
      );
    } else {
      const winnerID = gw.participants[Math.floor(Math.random() * gw.participants.length)];
      const winnerName = await getUserName(winnerID, api);

      // delete current message first kung meron
      if (gw.currentMsgID) {
        try { await api.unsendMessage(gw.currentMsgID); } catch (e) {}
      }

      await api.sendMessage(
`╭━🎊[GIVEAWAY ENDED]🎊━╮
┃ 🏆 Prize: ${gw.prize}
┃ 👑 Host: ${gw.hostName} (${gw.hostID})
┃ 🥳 Winner: ${winnerName} (${winnerID})
┃ 🆔 ID: ${gid}
╰━━━━━━━━━━━━━━━╯`,
        threadID
      );
    }

    delete giveawaysNow[gid];
    await setData(`/giveaway/${threadID}`, giveawaysNow);
  }, ms);
};

// ─── HANDLE JOIN ──────────────────────────────
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, type, messageReply } = event;
  if (type !== "message" || !messageReply) return;

  let giveaways = (await getData(`/giveaway/${threadID}`)) || {};
  if (!giveaways || Object.keys(giveaways).length === 0) return;

  for (const [gid, giveaway] of Object.entries(giveaways)) {
    // kung reply sa kasalukuyang message ng giveaway
    if (giveaway.currentMsgID !== messageReply.messageID) continue;

    if (!giveaway.participants.includes(senderID)) {
      giveaway.participants.push(senderID);

      // delete old message
      if (giveaway.currentMsgID) {
        try { await api.unsendMessage(giveaway.currentMsgID); } catch (e) {}
      }

      // send updated
      const remaining = giveaway.endTime - Date.now();
      const sent = await api.sendMessage(
`╭━🎉[GIVEAWAY ONGOING]🎉━╮
┃ 🏆 Prize: ${giveaway.prize}
┃ 👥 Participants: ${giveaway.participants.length}
┃ 👑 Host: ${giveaway.hostName} (${giveaway.hostID})
┃ ⏳ Time left: ${formatTime(remaining)}
┃ 🆔 ID: ${gid}
┃ 
┃ 👉 Reply to this message to join!
╰━━━━━━━━━━━━━━━╯`,
        threadID
      );

      giveaway.currentMsgID = sent.messageID;
      giveaways[gid] = giveaway;
      await setData(`/giveaway/${threadID}`, giveaways);

      api.sendMessage(`✅ Nakajoin ka na sa giveaway **${gid}**, salamat! 🎉`, threadID, undefined, undefined, senderID);
    } else {
      api.sendMessage("⚠️ Nakajoin ka na dati.", threadID, undefined, undefined, senderID);
    }
  }
};
