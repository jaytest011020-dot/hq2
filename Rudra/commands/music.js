const axios = require("axios");
const fs = require("fs");
const https = require("https");

module.exports.config = {
  name: "music",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Play music using AryanAPI (5-minute cooldown per user)",
  commandCategory: "music",
  usages: `
🎵 /music <title>
   - Plays music using YouTube API

📌 Example:
   /music Upuan by Gloc 9
`,
  cooldowns: 5
};

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
let userCooldowns = {}; // { senderID: timestamp }

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, messageID } = event;
  const query = args.join(" ");

  // ⏳ Check cooldown
  const now = Date.now();
  if (userCooldowns[senderID] && now - userCooldowns[senderID] < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - userCooldowns[senderID])) / 60000);
    return api.sendMessage(
      `⏳ Please wait ${remaining} minute(s) before using /music again.`,
      threadID,
      messageID
    );
  }

  if (!query) {
    return api.sendMessage("❌ Please provide a song title.\n\nExample: /music Upuan by Gloc 9", threadID, messageID);
  }

  try {
    // 🎧 Fetch from AryanAPI
    const response = await axios.get(`https://aryanapi.up.railway.app/api/youtubeplay?query=${encodeURIComponent(query)}`);

    console.log("API Response:", response.data);  // Log the response data for debugging

    if (!response.data || !response.data.status || !response.data.data) {
      return api.sendMessage("⚠️ No results found for that song.", threadID, messageID);
    }

    const music = response.data.data;

    if (!music.audio) {
      return api.sendMessage("⚠️ The audio for this song could not be fetched. Please try another song.", threadID, messageID);
    }

    // 🪄 Create info message
    const infoMsg = 
`🎧 Now Playing:
${music.title}

👤 Artist: ${music.video.author}
⏱ Duration: ${music.video.timestamp}
👀 Views: ${music.video.views.toLocaleString()}
📺 YouTube: ${music.video.url}

🎵 Downloading audio, please wait...`;

    // Send song info with thumbnail
    api.sendMessage(
      {
        body: infoMsg,
        attachment: await global.utils.getStreamFromURL(music.thumbnail)
      },
      threadID,
      async () => {
        try {
          // Fetch the audio using axios (to handle redirects properly)
          const audioStream = await axios.get(music.audio, {
            responseType: 'stream', // Stream the MP3 file
          });

          // Send the audio as an attachment
          api.sendMessage({ body: `🎶 ${music.title}`, attachment: audioStream.data }, threadID);

          // Start cooldown timer
          userCooldowns[senderID] = now; 
        } catch (err) {
          console.error("Error fetching audio stream:", err);
          api.sendMessage("❌ Failed to stream the audio file. The link might be broken.", threadID);
        }
      }
    );

  } catch (err) {
    console.error("API Request Error:", err);  // Log the full error to the console
    return api.sendMessage("⚠️ Error fetching music from the API. Try again later.", threadID, messageID);
  }
};