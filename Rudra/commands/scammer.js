const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "scammerlist",
  version: "1.3.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Scammer list with JSON storage",
  usePrefix: true,
  commandCategory: "system",
  usages: "/scammer | /addscam <name> <fb_link>",
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
  const { threadID, messageID } = event;
  let list = readList();

  // /scammer → show list
  if (args.length === 0) {
    return api.sendMessage(buildScammerList(list), threadID, messageID);
  }

  // /addscam <name> <link>
  if (args[0].toLowerCase() === "addscam") {
    if (args.length < 3) {
      return api.sendMessage(
        "⚠️ Usage: /addscam <name> <fb_link>",
        threadID,
        messageID
      );
    }

    const name = args[1];
    const fb = args.slice(2).join(" ");

    list.push({ name, fb });
    saveList(list);

    return api.sendMessage(
      `✅ Naidagdag sa scammer list:\n\n${name}\n🔗 ${fb}`,
      threadID,
      messageID
    );
  }

  // Invalid usage
  return api.sendMessage("⚠️ Unknown command. Use /scammer or /addscam", threadID, messageID);
};
