module.exports.config = {
  name: "scammerlist",
  version: "1.1.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Scammer list (auto-trigger at command)",
  usePrefix: true,
  commandCategory: "system",
  usages: "/scammer",
  cooldowns: 3
};

// --- DATA LIST NG SCAMMERS ---
const scammerList = [
  {
    name: "Christian Exhibit",
    fb: "https://www.facebook.com/share/179vDnMfmH/"
  },
  {
    name: "Clent John Tulalian",
    fb: "https://www.facebook.com/share/1E3znHcf8d/"
  },
  {
    name: "Mitsu Gt",
    fb: "https://www.facebook.com/share/19syFSNmqU/"
  },
  {
    name: "Yukie Lopez",
    fb: "https://www.facebook.com/share/1CYqPEycKp/"
  }
];

// --- FUNCTION TO FORMAT LIST ---
function buildScammerList() {
  let msg = "⚠️ Scammer Alert List ⚠️\n\n";
  scammerList.forEach((s, i) => {
    msg += `${i + 1}. ${s.name}\n🔗 FB: ${s.fb}\n\n`;
  });
  return msg.trim();
}

// --- AUTO-TRIGGER KAPAG MAY NAGSEND NG "scammer" or "scam" ---
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, body, messageID } = event;
  if (!body) return;

  const text = body.toLowerCase();

  if (text.includes("scammer") || text.includes("scam")) {
    return api.sendMessage(buildScammerList(), threadID, messageID);
  }
};

// --- MANUAL COMMAND: /scammer ---
module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;
  return api.sendMessage(buildScammerList(), threadID, messageID);
};
