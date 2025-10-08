const axios = require("axios");

module.exports.config = {
  name: "music",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Play music from an API with 5-minute cooldown per user",
  commandCategory: "music",
  usages: `
🎵 /music <title>
   - Plays a music track using API

📌 Example:
   /music Gloc 9 Upuan
`,
  cooldowns: 5
};

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per user
let userCooldowns = {}; // { senderID: timestamp }

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, messageID } = event;
  const query = args.join(" ");

  // ⏳ Cooldown Check
  const now = Date.now();
  if (userCooldowns[senderID] && now - userCooldowns[senderID] < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - userCooldowns[senderID])) / 60000);
    return api.sendMessage(`⏳ Please wait ${remaining} minute(s) before using /music again.`, threadID, messageID);
  }

  if (!query) {
    return api.sendMessage("❌ Please provide a song title.\n\nExample: /music Upuan by Gloc 9", threadID, messageID);
  }

  try {
    // 🌐 Call your API (replace this URL with your actual API endpoint)
    const response = await axios.get(`https://example.com/api/music?query=${encodeURIComponent(query)}`);

    if (!response.data || !response.data.status || !response.data.data) {
      return api.sendMessage("⚠️ No results found for that song.", threadID, messageID);
    }

    const music = response.data.data;

    const infoMsg = 
`🎧 Now Playing:
${music.title}
👤 Artist: ${music.video.author}
⏱ Duration: ${music.video.timestamp}
👀 Views: ${music.video.views.toLocaleString()}
📺 YouTube: ${music.video.url}

🎵 Downloading audio, please wait...`;

    // Send song info and thumbnail
    api.sendMessage(
      {
        body: infoMsg,
        attachment: await global.utils.getStreamFromURL(music.thumbnail)
      },
      threadID,
      async () => {
        try {
          // Send the actual MP3 file
          const stream = await global.utils.getStreamFromURL(music.audio);
          api.sendMessage({ body: `🎶 ${music.title}`, attachment: stream }, threadID);
          userCooldowns[senderID] = now; // Save cooldown
        } catch (err) {
          api.sendMessage("❌ Failed to send audio file.", threadID);
        }
      }
    );

  } catch (err) {
    console.error(err);
    return api.sendMessage("⚠️ Error fetching music from API. Try again later.", threadID, messageID);
  }
};