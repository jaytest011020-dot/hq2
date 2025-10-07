const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbprediction",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Add or view a global PVBR prediction message",
  usePrefix: true,
  commandCategory: "pvb tools",
  usages: "/pvbprediction add <text> | /pvbprediction view",
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const sub = args[0]?.toLowerCase();
  const text = args.slice(1).join(" ");

  // 🧩 Add or replace global prediction
  if (sub === "add") {
    if (!text) {
      return api.sendMessage(
        "⚠️ Please include a prediction text.\n\nExample:\n/pvbprediction add Next restock might be Dragon Fruit 🍉",
        threadID,
        messageID
      );
    }

    await setData(`pvbprediction/global`, { text });
    return api.sendMessage(
      `✅ Global PVBR Prediction updated!\n\n📜 New Prediction:\n${text}`,
      threadID,
      messageID
    );
  }

  // 👀 View global prediction
  if (sub === "view") {
    const data = await getData(`pvbprediction/global`);
    if (!data?.text) {
      return api.sendMessage("📭 No global prediction has been set yet.", threadID, messageID);
    }

    return api.sendMessage(`📜 Current Global Prediction:\n${data.text}`, threadID, messageID);
  }

  // 📝 Usage help
  return api.sendMessage(
    "⚙️ Usage:\n/pvbprediction add <text> → Set or replace global prediction\n/pvbprediction view → View global prediction",
    threadID,
    messageID
  );
};