const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "scammerlist",
  version: "1.4.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Scammer list with JSON storage (add/remove by bot admin)",
  usePrefix: true,
  commandCategory: "system",
  usages: "/scammer | /addscam <name> <fb_link> | /removescam <number>",
  cooldowns: 3
};

const dataFile = path.join(__dirname, "scammers.json");

// --- BASAHIN ANG JSON FILE ---
function readList() {
  if (!fs.existsSync(dataFile)) return [];
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

// --- ISAVE ANG JSON FILE ---
function saveList(list) {
  fs.writeFileSync(dataFile, JSON.stringify(list, null, 2));
}

// --- FORMAT LIST ---
function buildScammerList(list) {
  if (list.length === 0) return "✅ Walang naka-listang scammer.";

  let msg = "⚠️ Scammer Alert List ⚠️\n\n";
  list.forEach((s, i) => {
    msg += `${i + 1}. ${s.name}\n🔗 FB: ${s.fb}\n\n`;
  });
  return msg.trim();
}

// --- AUTO TRIGGER (kapag may "scammer" o "scam") ---
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, body, messageID } = event;
  if (!body) return;

  const text = body.toLowerCase();
  if (text.includes("scammer") || text.includes("scam")) {
    const list = readList();
    return api.sendMessage(buildScammerList(list), threadID, messageID);
  }
};

// --- MANUAL COMMANDS ---
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  let list = readList();

  // /scammer → show list
  if (args.length === 0 || args[0].toLowerCase() === "scammer") {
    return api.sendMessage(buildScammerList(list), threadID, messageID);
  }

  // /addscam <name> <link>
  if (args[0].toLowerCase() === "addscam") {
    if (!global.config.ADMINBOT.includes(senderID)) {
      return api.sendMessage(
        "❌ Only bot admins can add scammers.",
        threadID,
        messageID
      );
    }

    if (args.length < 3) {
      return api.sendMessage(
        "⚠️ Usage: /addscam <name> <fb_link>",
        threadID,
        messageID
      );
    }

    const fb = args[args.length - 1];
    const name = args.slice(1, -1).join(" ");

    list.push({ name, fb });
    saveList(list);

    return api.sendMessage(
      `✅ Naidagdag sa scammer list:\n\n${name}\n🔗 ${fb}`,
      threadID,
      messageID
    );
  }

  // /removescam <number>
  if (args[0].toLowerCase() === "removescam") {
    if (!global.config.ADMINBOT.includes(senderID)) {
      return api.sendMessage(
        "❌ Only bot admins can remove scammers.",
        threadID,
        messageID
      );
    }

    if (args.length < 2 || isNaN(args[1])) {
      return api.sendMessage(
        "⚠️ Usage: /removescam <number>",
        threadID,
        messageID
      );
    }

    const index = parseInt(args[1]) - 1;
    if (index < 0 || index >= list.length) {
      return api.sendMessage("⚠️ Invalid number.", threadID, messageID);
    }

    const removed = list.splice(index, 1)[0];
    saveList(list);

    return api.sendMessage(
      `🗑️ Natanggal sa scammer list:\n\n${removed.name}\n🔗 ${removed.fb}`,
      threadID,
      messageID
    );
  }

  // Invalid usage
  return api.sendMessage(
    "⚠️ Unknown command. Use /scammer, /addscam or /removescam",
    threadID,
    messageID
  );
};
