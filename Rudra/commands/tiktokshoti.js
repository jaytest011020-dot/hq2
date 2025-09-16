const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const cooldowns = new Map();

module.exports.config = {
  name: "music",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Search Apple Music & auto-play first result",
  commandCategory: "music",
  usages: "/music <song name>",
  cooldowns: 5,
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID, senderID } = event;

  // 🔹 Cooldown check (20s per user)
  const now = Date.now();
  const userCooldown = cooldowns.get(senderID) || 0;
  const remaining = Math.ceil((userCooldown - now) / 1000);
  if (remaining > 0) {
    return api.sendMessage(
      `⏳ Please wait ${remaining}s before using this command again.`,
      threadID,
      messageID
    );
  }
  cooldowns.set(senderID, now + 20 * 1000);

  const query = args.join(" ");
  if (!query) {
    return api.sendMessage("❗ Please provide a song name.", threadID, messageID);
  }

  try {
    // 🔹 Send loading message
    api.sendMessage("⏳ Searching & loading your music...", threadID, async (err, info) => {
      try {
        const apiURL = `https://kaiz-apis.gleeze.com/api/apple-music?search=${encodeURIComponent(query)}&apikey=71ee3719-dd7d-4a98-8484-eb0bb3081e0f`;
        const res = await axios.get(apiURL);

        if (!res.data || !res.data.response || res.data.response.length === 0) {
          return api.sendMessage("❌ No results found.", threadID, messageID);
        }

        const song = res.data.response[0]; // 🔹 First result only
        const tmpPath = path.join(__dirname, "cache", `music_${Date.now()}.m4a`);

        // 🔹 Download preview audio
        const audioBuffer = (await axios.get(song.previewMp3, { responseType: "arraybuffer" })).data;
        fs.writeFileSync(tmpPath, Buffer.from(audioBuffer, "binary"));

        // 🔹 Delete loading message bago mag-send ng result
        api.unsendMessage(info.messageID);

        // 🔹 Send music info + auto-play preview
        api.sendMessage(
          {
            body: `🎶 𝗠𝘂𝘀𝗶𝗰 𝗣𝗹𝗮𝘆𝗲𝗿\n\n🎵 Title: ${song.title}\n👤 Artist: ${song.artist}\n💿 Album: ${song.album}\n📅 Release: ${song.releaseDate}\n⏱ Duration: ${song.duration}\n🔗 [Apple Music Link](${song.url})`,
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
