const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "scamlist.json");

// Load scamlist
function loadScamList() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return { scammers: [] };
  }
}

// Save scamlist
function saveScamList(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

module.exports.config = {
  name: "scamremove",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Remove scammer from scamlist",
  commandCategory: "Safety",
  usages: "/scamremove <name>",
  cooldowns: 5,
};

module.exports.run = function ({ api, event, args }) {
  if (args.length < 1) {
    return api.sendMessage("❌ Usage: /scamremove <name>", event.threadID);
  }

  const name = args.join(" ");
  const data = loadScamList();

  const index = data.scammers.findIndex(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );

  if (index === -1) {
    return api.sendMessage(`⚠️ ${name} not found in scamlist.`, event.threadID);
  }

  const removed = data.scammers.splice(index, 1)[0];
  saveScamList(data);

  api.sendMessage(`✅ Removed scammer: ${removed.name}`, event.threadID);
};
