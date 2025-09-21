const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// Map to store cooldowns per user
const cooldowns = new Map();

module.exports.config = {
  name: "music",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Search and play full music",
  commandCategory: "music",
  usages: "/music <song name>",
  cooldowns: 5,
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID, senderID } = event;

  const now = Date.now();
  const userCooldown = cooldowns.get(senderID) || 0;
  const remaining = Math.ceil((userCooldown - now) / 1000);

  // 🔹 Check 1-minute cooldown
  if (remaining > 0) {
    return api.sendMessage(
      `❗ Please wait ${remaining}s before using /music again.`,
      threadID,
      messageID
    );
  }
  cooldowns.set(senderID, now + 60 * 1000); // 1 minute cooldown

  const query = args.join(" ");
  if (!query) {
    return api.sendMessage("❗ Please provide a song name.", threadID, messageID);
  }

  try {
    api.sendMessage("⏳ Searching & loading your music...", threadID, async (err, info) => {
      try {
        const apiURL = `https://betadash-api-swordslush-production.up.railway.app/sc?search=${encodeURIComponent(query)}`;
        const res = await axios.get(apiURL);

        console.log("📩 Raw API Response:", res.data); // 🔹 Debug log

        let song;

        // 🔹 Handle kung array o object ang response
        if (Array.isArray(res.data)) {
          song = res.data[0]; // kunin yung first result
        } else {
          song = res.data; // assume na object na sya
        }

        if (!song || !song.title || !(song.url || song.link)) {
          return api.sendMessage("❌ No results found or missing fields.", threadID, messageID);
        }

        const title = song.title || "Unknown Title";
        const url = song.url || song.link; // support both url/link
        const duration = song.duration || "N/A";
        const author = song.author || song.artist || "Unknown";

        const tmpPath = path.join(__dirname, "cache", `music_${Date.now()}.mp3`);

        // Download full audio
        const audioBuffer = (await axios.get(url, { responseType: "arraybuffer" })).data;
        fs.writeFileSync(tmpPath, Buffer.from(audioBuffer, "binary"));

        // Delete loading message
        api.unsendMessage(info.messageID);

        // Send music info + full audio
        api.sendMessage(
          {
            body: `🎶 𝗠𝘂𝘀𝗶𝗰 𝗣𝗹𝗮𝘆𝗲𝗿\n\n🎵 Title: ${title}\n👤 Artist: ${author}\n⏱ Duration: ${duration}`,
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
