const axios = require("axios");

module.exports.config = {
  name: "fancy",
  version: "1.0.2",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Convert text into fancy style using API",
  commandCategory: "fun",
  usages: "/fancy <style number> <text>",
  cooldowns: 3,
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args.length < 2) {
    return api.sendMessage(
      "📘 Usage: /fancy <style number> <text>\nExample: /fancy 3 Jaylord La Peña",
      threadID,
      messageID
    );
  }

  const style = args[0];
  const text = args.slice(1).join(" ");

  if (isNaN(style)) {
    return api.sendMessage(
      "⚠️ Please enter a valid style number (e.g., 1, 2, 3...)",
      threadID,
      messageID
    );
  }

  try {
    const url = `https://apis-keith.vercel.app/fancytext?q=${encodeURIComponent(
      text
    )}&style=${encodeURIComponent(style)}`;
    const { data } = await axios.get(url, { timeout: 15000 });

    if (!data?.result) {
      return api.sendMessage("❌ Failed to generate fancy text.", threadID, messageID);
    }

    const result = data.result;
    const styleNum = data.style;

    const msg = `🎨 Style: ${styleNum}\n💎 ${result}`;

    // ✅ Reply to the user's original message
    return api.sendMessage(msg, threadID, messageID);
  } catch (err) {
    console.error("Fancy text error:", err);
    return api.sendMessage(
      "⚠️ Error while fetching fancy text. Please try again later.",
      threadID,
      messageID
    );
  }
};