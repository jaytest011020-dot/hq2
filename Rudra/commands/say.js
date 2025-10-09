const axios = require("axios");
const fs = require("fs");
const path = require("path");

// 🕒 Cooldown map
const cooldown = new Map();

module.exports.config = {
  name: "say",
  version: "1.0.2",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord La Peña",
  description: "Converts text to speech using Ana (Female) voice (with 5-minute cooldown per user)",
  usages: "/say <text>",
  commandCategory: "fun",
  cooldowns: 3,
};

module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID, messageID } = event;
  const text = args.join(" ");

  // 5-minute cooldown
  const cooldownTime = 5 * 60 * 1000; // 5 minutes in ms
  const lastUsed = cooldown.get(senderID);

  if (lastUsed && Date.now() - lastUsed < cooldownTime) {
    const remaining = Math.ceil((cooldownTime - (Date.now() - lastUsed)) / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return api.sendMessage(
      `⏳ Please wait ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s before using /say again.`,
      threadID,
      messageID
    );
  }

  if (!text)
    return api.sendMessage("⚠️ Please provide text to convert.\nExample: /say Hello everyone!", threadID, messageID);

  try {
    const url = `https://apis-keith.vercel.app/ai/tts?q=${encodeURIComponent(text)}`;
    const res = await axios.get(url);

    // Find Ana (Female)
    const ana = res.data?.result?.voices?.find(v => v.voice_name.toLowerCase().includes("ana"));
    if (!ana || !ana.audio_url)
      return api.sendMessage("❌ Couldn't find Ana's voice in response.", threadID, messageID);

    // Download the audio file
    const audioPath = path.join(__dirname, "ana_tts.wav");
    const audioRes = await axios.get(ana.audio_url, { responseType: "arraybuffer" });
    fs.writeFileSync(audioPath, audioRes.data);

    // Send audio only
    api.sendMessage(
      { attachment: fs.createReadStream(audioPath) },
      threadID,
      () => fs.unlinkSync(audioPath), // delete after sending
      messageID
    );

    // Set cooldown timestamp
    cooldown.set(senderID, Date.now());

  } catch (err) {
    console.error("❌ /say error:", err);
    api.sendMessage("❌ Failed to fetch voice audio. Please try again later.", threadID, messageID);
  }
};