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
  name: "removescam",
  version: "1.0.0",
  hasPermssion: 2, // admin lang pwede
  credits: "YourName",
  description: "Remove scammer from list",
  commandCategory: "system",
  usages: "/removescam <name>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  if (args.length < 1) {
    return api.sendMessage("❌ Usage: /removescam <name>", event.threadID, event.messageID);
  }

  const name = args[0];
  let data = loadScammers();
  const index = data.scammers.findIndex(item => item.name.toLowerCase() === name.toLowerCase());

  if (index === -1) {
    return api.sendMessage(`❌ Walang nakitang scammer na ${name}.`, event.threadID, event.messageID);
  }

  data.scammers.splice(index, 1);
  saveScammers(data);

  api.sendMessage(`✅ Tinanggal si ${name} sa scammer list.`, event.threadID, event.messageID);
};
