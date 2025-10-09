const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbprediction",
  version: "1.0.3",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Add or view Plants vs Brainrots global stock prediction",
  commandCategory: "pvb tools",
  usePrefix: true,
  usages: `
🔮 /pvbprediction add <text>
   ➤ Add or update today's prediction

🔮 /pvbprediction
   ➤ View current prediction
`,
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // 🟣 No args → show current prediction
  if (args.length === 0) {
    const data = await getData("pvbprediction/global");

    if (!data || !data.text) {
      return api.sendMessage("🔮 No prediction for today.", threadID, messageID);
    }

    const msg = `🔮 𝗣𝗩𝗕𝗥 𝗣𝗿𝗲𝗱𝗶𝗰𝘁𝗶𝗼𝗻\n──────────────────\n${data.text}`;
    return api.sendMessage(msg, threadID, messageID);
  }

  // 🔵 Subcommand: add
  const subcmd = args[0].toLowerCase();
  if (subcmd === "add") {
    const predictionText = args.slice(1).join(" ");
    if (!predictionText) {
      return api.sendMessage(
        "⚠️ Please provide a prediction text.\n\nExample:\n/pvbprediction add Godly Mango seed next stock",
        threadID,
        messageID
      );
    }

    const oldData = await getData("pvbprediction/global");
    const oldPrediction = oldData?.text || null;

    await setData("pvbprediction/global", {
      text: predictionText,
      author: senderID,
      date: Date.now(),
    });

    if (oldPrediction) {
      return api.sendMessage(
        `♻️ Previous prediction replaced.\n\n✅ New prediction:\n"${predictionText}"`,
        threadID,
        messageID
      );
    } else {
      return api.sendMessage(`✅ Prediction added:\n\n"${predictionText}"`, threadID, messageID);
    }
  }

  // ❌ Invalid usage
  return api.sendMessage(
    "⚙️ Usage:\n🔮 /pvbprediction add <text>\n🔮 /pvbprediction (to view current prediction)",
    threadID,
    messageID
  );
};