const { setData } = require("../../database.js");

module.exports.config = {
  name: "appupdate",
  version: "1.0.0",
  credits: "Jaylord La Peña + ChatGPT",
  description: "Update app version and link in Firebase",
  usages: "/appupdate <version> <link>",
  commandCategory: "system",
  cooldowns: 3,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  // ✅ Allowed UIDs lang pwede mag-update
  const allowedUIDs = ["61563731477181", "61559999326713"];
  if (!allowedUIDs.includes(senderID)) {
    return api.sendMessage("❌ You are not allowed to update the app.", threadID, messageID);
  }

  // ✅ Kailangan may version at link
  if (args.length < 2) {
    return api.sendMessage("❌ Usage: /appupdate <version> <link>", threadID, messageID);
  }

  const version = args[0];
  const link = args.slice(1).join(" ");

  try {
    // 🔥 Save sa Firebase path: update/update
    await setData("update/update", { version, link });

    return api.sendMessage(
      `✅ App update saved!\n\n📌 Version: ${version}\n🔗 Link: ${link}`,
      threadID,
      messageID
    );
  } catch (err) {
    console.error("App update error:", err);
    return api.sendMessage("❌ Failed to update app. Check logs.", threadID, messageID);
  }
};
