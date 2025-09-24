const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getData } = require("../../database.js");

const OWNER_UID = "61559999326713";

module.exports.config = {
  name: "flashnews",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Send flash news image via API",
  usages: "/flashnews @mention|channel|title|headline",
  commandCategory: "vip",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args, mentions }) {
  const { threadID, senderID } = event;

  // --- VIP Check ---
  const vips = (await getData("/vip")) || [];
  const isVIP = vips.some(v => v.uid === senderID) || senderID === OWNER_UID;
  if (!isVIP) return api.sendMessage("❌ You are not allowed to use this command.", threadID);

  // --- Check mention ---
  if (!mentions || Object.keys(mentions).length === 0) 
    return api.sendMessage("❌ Please mention a user for the flash news.", threadID);

  const targetUID = Object.keys(mentions)[0]; // Get UID from mention
  const mentionName = Object.values(mentions)[0];

  // --- Combine all args and split by "|" ---
  const input = args.join(" ").split("|");
  if (input.length < 4) {
    return api.sendMessage("❌ Usage: /flashnews @mention|channel|title|headline", threadID);
  }

  const channel = input[1].trim();
  const title = input[2].trim();
  const headline = input[3].trim();

  // --- Call API ---
  const apiURL = `https://betadash-api-swordslush-production.up.railway.app/breaking-news`;
  try {
    const res = await axios.get(apiURL, {
      params: {
        userid: targetUID,
        channel,
        title,
        headline
      },
      responseType: "arraybuffer"
    });

    // --- Save image temporarily ---
    const imgPath = path.join(__dirname, "cache", `flashnews_${Date.now()}.jpeg`);
    fs.writeFileSync(imgPath, Buffer.from(res.data, "binary"));

    // --- Send image ---
    api.sendMessage(
      { body: `📰 Flash News for ${mentionName}`, attachment: fs.createReadStream(imgPath) },
      threadID,
      () => fs.unlinkSync(imgPath) // Delete after sending
    );

  } catch (err) {
    console.error(err);
    return api.sendMessage("⚠️ Failed to fetch flash news image.", threadID);
  }
};
