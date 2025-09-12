const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "scamlist.json");

function loadScamList() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return { scammers: [] };
  }
}
function saveScamList(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

module.exports.config = {
  name: "scamadd",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Add scammer to scamlist",
  commandCategory: "Safety",
  usages: "/scam add <name> <fb link>",
  cooldowns: 5,
};

module.exports.run = function ({ api, event, args }) {
  if (args.length < 3) {
    return api.sendMessage("❌ Usage: /scam add <name> <fb link>", event.threadID);
  }
  args.shift(); // remove 'add'
  const name = args.slice(0, -1).join(" ");
  const link = args[args.length - 1];

  const data = loadScamList();
  data.scammers.push({ name, link });
  saveScamList(data);

  api.sendMessage(`✅ Added scammer:\n${name} - ${link}`, event.threadID);
};
