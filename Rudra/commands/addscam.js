const fs = require("fs");
const path = require("path");
const scamFile = path.join(__dirname, "scammers.json");

function loadScammers() {
  if (!fs.existsSync(scamFile)) {
    fs.writeFileSync(scamFile, JSON.stringify({ scammers: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(scamFile));
}

function saveScammers(data) {
  fs.writeFileSync(scamFile, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "addscam",
  version: "1.0.0",
  hasPermssion: 2, // admin lang pwede
  credits: "YourName",
  description: "Add scammer to list",
  commandCategory: "system",
  usages: "/addscam <name> <link>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  if (args.length < 2) {
    return api.sendMessage("❌ Usage: /addscam <name> <fb_link>", event.threadID, event.messageID);
  }

  const name = args[0];
  const fb = args[1];

  const data = loadScammers();
  data.scammers.push({ name, fb });
  saveScammers(data);

  api.sendMessage(`✅ Na-add si ${name} sa scammer list!`, event.threadID, event.messageID);
};
