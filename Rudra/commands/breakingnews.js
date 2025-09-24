const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getData } = require("../../database.js");

const OWNER_UID = "61559999326713";

module.exports.config = {
  name: "breakingnews",
  version: "1.2.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Send breaking news image via API (VIP/Owner only)",
  usages: "/breakingnews @mention <channel> <title> <headline>",
  commandCategory: "admin",
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
    return api.sendMessage("❌ Please mention a user for the breaking news.", threadID);

  const targetUID = Object.keys(mentions)[0]; // Get first mention UID

  // --- Validate args ---
  if (args.length < 4) 
    return api.sendMessage("❌ Usage: /breakingnews @mention <channel> <title> <headline>", threadID);

  // Remove mention text from args
  const mentionName = Object.values(mentions)[0];
  const mentionIndex = args.indexOf(mentionName);
  if (mentionIndex > -1) args.splice(mentionIndex, 1);

  const channel = args[0];
  const title = args[1];
  const headline = args.slice(2).join(" ");

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
    const imgPath = path.join(__dirname, "cache", `breakingnews_${Date.now()}.jpeg`);
    fs.writeFileSync(imgPath, Buffer.from(res.data, "binary"));

    // --- Send image ---
    api.sendMessage(
      { body: `📰 Breaking news for ${mentionName}`, attachment: fs.createReadStream(imgPath) },
      threadID,
      () => fs.unlinkSync(imgPath) // Delete after sending
    );

  } catch (err) {
    console.error(err);
    return api.sendMessage("⚠️ Failed to fetch breaking news image.", threadID);
  }
};
