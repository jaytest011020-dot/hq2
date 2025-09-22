const { setData, getData } = require("../../database.js");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "race",
  version: "1.3.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Horse race betting game with countdown & prize pool, GC toggle & maintenance",
  usages: "/race <amount> | /race on | /race off",
  commandCategory: "games",
  cooldowns: 3,
};

// Helper to format progress bars
function renderRace(progress, trackLength = 10) {
  return "▓".repeat(progress) + "░".repeat(trackLength - progress);
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;
  const command = args[0]?.toLowerCase();

  // 🔹 Check maintenance
  const maintenance = (await getData(`/maintenance`)) || { enabled: false };
  if (maintenance.enabled) {
    const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg");
    return api.sendMessage(
      {
        body: "🚧 Bot is under maintenance. Race command temporarily disabled.",
        attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : null
      },
      threadID,
      messageID
    );
  }

  // 🔹 Handle /race on/off toggle (GC admin only)
  if (command === "on" || command === "off") {
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);
      if (!isAdmin) return api.sendMessage("❌ Only GC admins can toggle the race command.", threadID, messageID);

      const enabled = command === "on";
      await setData(`race/status/${threadID}`, { enabled });
      return api.sendMessage(
        `🏇 Race system is now ${enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
        threadID,
        messageID
      );
    } catch (err) {
      console.error("[RACE] Toggle error:", err);
      return api.sendMessage("⚠️ Failed to toggle race system.", threadID, messageID);
    }
  }

  // 🔹 Check if race is enabled in this GC
  const raceStatus = (await getData(`race/status/${threadID}`)) || { enabled: true };
  if (!raceStatus.enabled) return api.sendMessage("❌ Race command is disabled by GC admin.", threadID, messageID);

  // 🔹 Validate bet amount
  const bet = parseInt(args[0]);
  if (!bet || bet <= 0) return api.sendMessage("❌ Usage: /race <bet amount>", threadID, messageID);

  // Load race state
  let raceData = (await getData(`race/${threadID}`)) || { ongoing: false, bet: 0, players: [] };

  // 🔹 Prevent multiple races
  if (raceData.ongoing) {
    // Check if user already joined
    if (raceData.players.find(p => p.id === senderID)) {
      return api.sendMessage("❌ You already joined the ongoing race!", threadID, messageID);
    }

    // Deduct from player bank
    let playerData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0, name: "Unknown" };
    if (playerData.balance < raceData.bet) {
      return api.sendMessage(`❌ You need at least ${raceData.bet} coins to join. Your balance: ${playerData.balance}`, threadID, messageID);
    }

    playerData.balance -= raceData.bet;
    await setData(`bank/${threadID}/${senderID}`, playerData);

    raceData.players.push({ id: senderID, name: playerData.name, bet: raceData.bet });
    await setData(`race/${threadID}`, raceData);

    return api.sendMessage(
      `✅ ${playerData.name} joined the race!\n💸 -${raceData.bet} coins\n💰 Remaining balance: ${playerData.balance}`,
      threadID,
      messageID
    );
  }

  // 🔹 Start a new race
  let playerData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0, name: "Unknown" };
  if (playerData.balance < bet) {
    return api.sendMessage(`❌ You need at least ${bet} coins to start a race. Your balance: ${playerData.balance}`, threadID, messageID);
  }

  playerData.balance -= bet;
  await setData(`bank/${threadID}/${senderID}`, playerData);

  raceData = {
    ongoing: true,
    bet,
    players: [{ id: senderID, name: playerData.name, bet }],
  };
  await setData(`race/${threadID}`, raceData);

  api.sendMessage(
    `🏇 A new horse race has started!\n💰 Entry fee: ${bet} coins\n\nType /race ${bet} to join!\n⏳ Race will start in 1 minute...`,
    threadID,
    messageID
  );

  // Start countdown after 1 min
  setTimeout(async () => {
    let raceData = (await getData(`race/${threadID}`));
    if (!raceData || !raceData.ongoing || raceData.players.length < 2) {
      raceData.ongoing = false;
      await setData(`race/${threadID}`, raceData);
      return api.sendMessage("❌ Race cancelled. Not enough players (need at least 2).", threadID);
    }

    api.sendMessage("⏳ The race is about to begin!\n3...", threadID);
    setTimeout(() => api.sendMessage("2...", threadID), 1000);
    setTimeout(() => api.sendMessage("1...", threadID), 2000);
    setTimeout(() => api.sendMessage("🏁 GO!", threadID), 3000);

    let trackLength = 10;
    let progress = raceData.players.map(() => 0);
    let finished = false;

    async function updateRace() {
      if (finished) return;

      // Update random horses
      for (let i = 0; i < progress.length; i++) {
        if (progress[i] < trackLength) {
          if (Math.random() > 0.4) progress[i] += 1;
        }
      }

      // Build race board
      let prizePool = raceData.bet * raceData.players.length;
      let msg = "🏁 Horse Race Progress 🏁\n\n";
      raceData.players.forEach((p, i) => {
        msg += `${i + 1}. ${p.name}: ${renderRace(progress[i], trackLength)}\n`;
      });

      msg += `\n💰 Bet: ${raceData.bet} coins\n👥 Players: ${raceData.players.length}\n💵 Total Prize Pool: ${prizePool} coins`;

      // Check winner
      let winnerIndex = progress.findIndex(p => p >= trackLength);
      if (winnerIndex !== -1) {
        finished = true;
        const prize = prizePool;
        const winner = raceData.players[winnerIndex];

        let winnerData = (await getData(`bank/${threadID}/${winner.id}`)) || { balance: 0, name: winner.name };
        winnerData.balance += prize;
        await setData(`bank/${threadID}/${winner.id}`, winnerData);

        msg += `\n\n🎉 Winner: ${winner.name} 🏆\n💰 Prize: ${prize} coins`;

        raceData.ongoing = false;
        await setData(`race/${threadID}`, raceData);

        return api.sendMessage(msg, threadID);
      }

      api.sendMessage(msg, threadID, () => {
        setTimeout(updateRace, 5000);
      });
    }

    setTimeout(updateRace, 3500);
  }, 60000);
};
