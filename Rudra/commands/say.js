const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "say",
  version: "1.0.1",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord La Peña",
  description: "Converts text to speech using Ana (Female) voice only",
  usages: "/say <text>",
  commandCategory: "fun",
  cooldowns: 3,
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const text = args.join(" ");

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

  } catch (err) {
    console.error("❌ /say error:", err);
    api.sendMessage("❌ Failed to fetch voice audio. Please try again later.", threadID, messageID);
  }
};