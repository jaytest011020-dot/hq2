// modules/earncoins.js
const fs = require("fs");
const path = require("path");

// same bank file used by your bank module
const dataFile = path.join(__dirname, "bank.json");

// Ensure bank file exists
if (!fs.existsSync(dataFile)) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify({}, null, 2), "utf8");
    console.log("[earncoins] Created bank.json");
  } catch (e) {
    console.error("[earncoins] Failed to create bank.json", e);
  }
}

// Load bank
function loadBank() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch (e) {
    console.error("[earncoins] Failed to read bank.json:", e);
    return {};
  }
}

// Save bank
function saveBank(data) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("[earncoins] Failed to write bank.json:", e);
  }
}

module.exports.config = {
  name: "earncoins",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Earn 5 coins on every message",
  commandCategory: "Economy",
  usages: "Passive",
  cooldowns: 0,
};

// Give 5 coins on each message
// Note: bot frameworks sometimes call handleEvent with ({ event, api }) so include both.
module.exports.handleEvent = async function ({ event, api }) {
  try {
    if (!event) return;

    // required fields
    const senderID = event.senderID || event.sender_id || event.sender;
    const threadID = event.threadID || event.thread_id || event.thread;

    // basic sanity checks
    if (!senderID || !threadID) return;

    // ignore messages from the bot itself (best-effort)
    if (api && typeof api.getCurrentUserID === "function") {
      try {
        const me = api.getCurrentUserID();
        if (me && String(me) === String(senderID)) return;
      } catch (e) {
        // ignore if api.getCurrentUserID isn't available
      }
    }

    // optionally ignore commands (messages starting with "/") so commands don't give coins
    const text = (event.body || event.message || "").toString();
    if (text.startsWith("/")) return;

    // load, update, save
    const bank = loadBank();
    if (!bank[senderID]) bank[senderID] = { balance: 0 };

    bank[senderID].balance = Number(bank[senderID].balance || 0) + 5;
    saveBank(bank);

    // debug log - remove or comment out if too chatty
    console.log(`[earncoins] +5 to ${senderID} (now ${bank[senderID].balance})`);
  } catch (err) {
    console.error("[earncoins] handleEvent error:", err);
  }
};
