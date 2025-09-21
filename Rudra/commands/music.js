const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { setData, getData } = require("../../database.js"); // ✅ Import database

// Map to store cooldowns per user
const cooldowns = new Map();

module.exports.config = {
  name: "music",
  version: "2.2.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Search and play full music with GC admin toggle on/off",
  commandCategory: "music",
  usages: "/music <song name> | /music on | /music off",
  cooldowns: 5,
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID, senderID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // 🔹 Handle /music on/off toggle (GC admin only)
  if (command === "on" || command === "off") {
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);
      if (!isAdmin) {
        return api.sendMessage("❌ Only GC admins can toggle the music command.", threadID, messageID);
      }

      const enabled = command === "on";
      await setData(`music/status/${threadID}`, { enabled });

      return api.sendMessage(
        `🎶 Music system is now ${enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
        threadID,
        messageID
      );
    } catch (err) {
      console.error("[MUSIC] Toggle error:", err);
      return api.sendMessage("⚠️ Failed to toggle music system.", threadID, messageID);
    }
  }

  // 🔹 Check if music system is enabled
  const musicStatus = (await getData(`music/status/${threadID}`)) || { enabled: true };
  if (!musicStatus.enabled) {
    return api.sendMessage("❌ Music command is currently disabled by GC admin.", threadID, messageID);
  }

  // 🔹 Check cooldown (1 min)
  const now = Date.now();
  const userCooldown = cooldowns.get(senderID) || 0;
  const remaining = Math.ceil((userCooldown - now) / 1000);
  if (remaining > 0) {
    return api.sendMessage(
      `❗ Please wait ${remaining}s before using /music again.`,
      threadID,
      messageID
    );
  }
  cooldowns.set(senderID, now + 60 * 1000);

  // 🔹 Music search
  const query = args.join(" ");
  if (!query) {
    return api.sendMessage("❗ Please provide a song name.", threadID, messageID);
  }

  try {
    api.sendMessage("⏳ Searching & loading your music...", threadID, async (err, info) => {
      try {
        const apiURL = `https://betadash-api-swordslush-production.up.railway.app/sc?search=${encodeURIComponent(query)}`;
        const tmpPath = path.join(__dirname, "cache", `music_${Date.now()}.mp3`);

        // Download full audio directly
        const audioBuffer = (await axios.get(apiURL, { responseType: "arraybuffer" })).data;
        fs.writeFileSync(tmpPath, Buffer.from(audioBuffer, "binary"));

        // Delete "loading..." message
        api.unsendMessage(info.messageID);

        // Send music info + audio
        api.sendMessage(
          {
            body: `🎶 𝗠𝘂𝘀𝗶𝗰 𝗣𝗹𝗮𝘆𝗲𝗿\n\n🎵 Title: ${query}\n👤 Artist: Unknown\n⏱ Duration: Unknown`,
            attachment: fs.createReadStream(tmpPath),
          },
          threadID,
          () => fs.unlinkSync(tmpPath),
          messageID
        );
      } catch (err) {
        console.error("❌ Music Command Error:", err);
        api.sendMessage("⚠️ Error fetching music.", threadID, messageID);
      }
    });
  } catch (err) {
    console.error("❌ Music Command Error:", err);
    api.sendMessage("⚠️ Error fetching music.", threadID, messageID);
  }
};
