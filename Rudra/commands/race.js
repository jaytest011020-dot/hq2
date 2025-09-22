const { setData, getData } = require("../../database.js");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "race",
  version: "1.2.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Horse race betting game with countdown & prize pool",
  usages: "/race <amount>",
  commandCategory: "games",
  cooldowns: 3,
};

// Helper to format progress bars
function renderRace(progress, trackLength = 10) {
  return "▓".repeat(progress) + "░".repeat(trackLength - progress);
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;
  const bet = parseInt(args[0]);

  // 🔹 Check maintenance system
  const maintenance = (await getData(`system/maintenance`)) || { enabled: false };
  if (maintenance.enabled) {
    const videoPath = path.join(__dirname, "cache", "AI data.mp4");
    return api.sendMessage(
      {
        body: "⚠️ Bot is under maintenance.\n\nPlease try again later.",
        attachment: fs.existsSync(videoPath) ? fs.createReadStream(videoPath) : null
      },
      threadID,
      messageID
    );
  }

  if (!bet || bet <= 0) {
    return api.sendMessage("❌ Usage: /race <bet amount>", threadID, messageID);
  }

  // Load race state
  let raceData = (await getData(`race/${threadID}`)) || { ongoing: false };

  // If race ongoing, join instead
  if (raceData.ongoing) {
    if (raceData.players.find(p => p.id === senderID)) {
      return api.sendMessage("❌ You already joined the race!", threadID, messageID);
    }

    // Deduct from player bank
    let playerData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0, name: "Unknown" };
    if (playerData.balance < bet) {
      return api.sendMessage(`❌ You need at least ${bet} coins to join. Your balance: ${playerData.balance}`, threadID, messageID);
    }

    playerData.balance -= bet;
    await setData(`bank/${threadID}/${senderID}`, playerData);

    raceData.players.push({ id: senderID, name: playerData.name, bet });
    await setData(`race/${threadID}`, raceData);

    return api.sendMessage(
      `✅ ${playerData.name} joined the race!\n💸 -${bet} coins\n💰 Remaining balance: ${playerData.balance}`,
      threadID,
      messageID
    );
  }

  // New race
  let playerData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0, name: "Unknown" };
  if (playerData.balance < bet) {
    return api.sendMessage(`❌ You need at least ${bet} coins to join. Your balance: ${playerData.balance}`, threadID, messageID);
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
    `🏇 A new horse race has started!\n💰 Entry fee: ${bet} coins\n\nType /race ${bet} to join!\n\n⏳ Race will start in 1 minute...`,
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

    // 3-second countdown
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
          if (Math.random() > 0.4) progress[i] += 1; // chance to move forward
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

        // Add prize to winner
        let winnerData = (await getData(`bank/${threadID}/${winner.id}`)) || { balance: 0, name: winner.name };
        winnerData.balance += prize;
        await setData(`bank/${threadID}/${winner.id}`, winnerData);

        msg += `\n\n🎉 Winner: ${winner.name} 🏆\n💰 Prize: ${prize} coins`;

        // Reset race
        raceData.ongoing = false;
        await setData(`race/${threadID}`, raceData);

        return api.sendMessage(msg, threadID);
      }

      api.sendMessage(msg, threadID, () => {
        setTimeout(updateRace, 5000); // update every 5s
      });
    }

    setTimeout(updateRace, 3500); // start after countdown
  }, 60000); // 1 min join time
};
