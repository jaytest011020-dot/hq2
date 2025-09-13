const fs = require("fs");
const path = require("path");

// Path to JSON file
const dataFile = path.join(__dirname, "bank.json");

// Ensure file exists
if (!fs.existsSync(dataFile)) {
fs.writeFileSync(dataFile, JSON.stringify({}, null, 2), "utf8");
}

// Load data
function loadBank() {
try {
return JSON.parse(fs.readFileSync(dataFile, "utf8"));
} catch {
return {};
}
}

// Save data
function saveBank(data) {
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

module.exports.config = {
name: "bank",
version: "1.5.0",
hasPermssion: 0,
credits: "ChatGPT + Jaylord",
description: "Simple bank system with admin add feature (+ earn 5 coins per normal message)",
commandCategory: "Economy",
usages: "/bank, /bank all, /bank add <uid> <amount>",
cooldowns: 3,
};

// 🔑 Bot admins (add your Facebook UID here)
const BOT_ADMINS = ["61559999326713"]; // <-- replace with your UID(s)

// Format balance
function formatBalance(user, balance) {
return 🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins;
}

// 🔹 Add 5 coins per normal message (not a command)
module.exports.handleEvent = function ({ event }) {
const { senderID, body } = event;
if (!senderID || !body) return;

// If message starts with "/" → it's a command, no coins
if (body.trim().startsWith("/")) return;

const bank = loadBank();
if (!bank[senderID]) bank[senderID] = { balance: 0 };

bank[senderID].balance += 5; // earn 5 coins each normal message
saveBank(bank);
};

// 🔹 Run command
module.exports.run = async function ({ api, event, args, Users }) {
const { threadID, senderID } = event;
const bank = loadBank();

// Ensure user exists in bank
if (!bank[senderID]) bank[senderID] = { balance: 0 };
saveBank(bank);

const command = args[0]?.toLowerCase();

// Show all accounts
if (command === "all") {
let arr = [];
for (const [id, data] of Object.entries(bank)) {
let name;
try {
name = await Users.getNameUser(id);
} catch {
name = id; // fallback to UID
}
arr.push({ name, balance: data.balance });
}

arr.sort((a, b) => b.balance - a.balance);  

let msg = `📋 All Bank Accounts (Total: ${arr.length}) 📋\n`;  
arr.forEach((u, i) => {  
  msg += `\n${i + 1}. ${u.name} - 💰 ${u.balance.toLocaleString()} coins`;  
});  

return api.sendMessage(msg, threadID);

}

// 🔹 Admin-only: add money by UID
if (command === "add") {
if (!BOT_ADMINS.includes(senderID)) {
return api.sendMessage("❌ Only bot admins can add coins.", threadID);
}

const targetUID = args[1];  
const amount = parseInt(args[2]);  

if (!targetUID || isNaN(amount) || amount <= 0) {  
  return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID);  
}  

if (!bank[targetUID]) bank[targetUID] = { balance: 0 };  
bank[targetUID].balance += amount;  
saveBank(bank);  

let name;  
try {  
  name = await Users.getNameUser(targetUID);  
} catch {  
  name = targetUID;  
}  

return api.sendMessage(  
  `✅ Added 💰 ${amount.toLocaleString()} coins to ${name}'s account.`,  
  threadID  
);

}

// Default: show own balance
let name;
try {
name = await Users.getNameUser(senderID);
} catch {
name = senderID;
}

return api.sendMessage(formatBalance(name, bank[senderID].balance), threadID);
};

