const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.sqlite");

// ---------------- TABLES ----------------
db.run("CREATE TABLE IF NOT EXISTS bank (user_id TEXT PRIMARY KEY, balance INTEGER)");
db.run("CREATE TABLE IF NOT EXISTS redeem (id INTEGER PRIMARY KEY AUTOINCREMENT, pet_name TEXT UNIQUE, price INTEGER)");

// ---------------- CONFIG ----------------
const BOT_ADMIN = "61559999326713"; // Change to your bot admin FB ID

module.exports.config = {
  name: "redeem",
  version: "1.2.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Redeem pets using coins",
  usePrefix: true,
  commandCategory: "economy",
  usages: "/redeem, /redeem add <pet> <price>, /redeem remove <pet>",
  cooldowns: 3
};

// ---------------- BANK FUNCTIONS ----------------
function getBalance(userID, callback) {
  db.get("SELECT balance FROM bank WHERE user_id = ?", [userID], (err, row) => {
    if (err || !row) {
      db.run("INSERT OR IGNORE INTO bank (user_id, balance) VALUES (?, 0)", [userID]);
      return callback(0);
    }
    callback(row.balance);
  });
}

function setBalance(userID, amount, callback) {
  db.run(
    "INSERT INTO bank (user_id, balance) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = ?",
    [userID, amount, amount],
    () => callback && callback()
  );
}

// ---------------- RUN COMMAND ----------------
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // ---------- ADMIN ADD PET ----------
  if (args[0] === "add") {
    if (senderID !== BOT_ADMIN) 
      return api.sendMessage("❌ Only bot admin can add pets.", threadID, messageID);

    if (args.length < 3) 
      return api.sendMessage("❌ Usage: /redeem add <petname> <price>", threadID, messageID);

    const petName = args[1];
    const price = parseInt(args[2]);

    if (isNaN(price) || price <= 0) 
      return api.sendMessage("❌ Invalid price.", threadID, messageID);

    db.run("INSERT OR REPLACE INTO redeem (pet_name, price) VALUES (?, ?)", [petName, price], (err) => {
      if (err) return api.sendMessage("⚠️ Failed to add pet.", threadID, messageID);
      api.sendMessage(`✅ Added pet "${petName}" for ${price} coins.`, threadID, messageID);
    });
    return;
  }

  // ---------- ADMIN REMOVE PET ----------
  if (args[0] === "remove") {
    if (senderID !== BOT_ADMIN) 
      return api.sendMessage("❌ Only bot admin can remove pets.", threadID, messageID);

    if (args.length < 2) 
      return api.sendMessage("❌ Usage: /redeem remove <petname>", threadID, messageID);

    const petName = args[1];
    db.run("DELETE FROM redeem WHERE pet_name = ?", [petName], function (err) {
      if (err) return api.sendMessage("⚠️ Failed to remove pet.", threadID, messageID);
      if (this.changes === 0) return api.sendMessage("❌ Pet not found.", threadID, messageID);
      api.sendMessage(`✅ Removed pet "${petName}".`, threadID, messageID);
    });
    return;
  }

  // ---------- SHOW PET LIST (Anyone can redeem) ----------
  db.all("SELECT * FROM redeem", [], (err, rows) => {
    if (err || rows.length === 0) 
      return api.sendMessage("⚠️ No pets available to redeem.", threadID, messageID);

    let msg = "🐾 Available Pets to Redeem 🐾\n\n";
    rows.forEach((row, i) => {
      msg += `${i + 1}. ${row.pet_name} - 💰 ${row.price} coins\n`;
    });
    msg += "\nReply with the number of the pet to redeem.";

    // Store reply info
    global.client.handleReply.push({
      type: "redeem_select",
      name: "redeem",
      author: senderID,
      pets: rows
    });

    api.sendMessage(msg, threadID, (err, info) => {
      if (!err) global.client.handleReply.slice(-1)[0].messageID = info.messageID;
    });
  });
};

// ---------------- HANDLE REPLY ----------------
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;

  if (handleReply.type !== "redeem_select" || handleReply.author !== senderID) return;

  const choice = parseInt(body);
  if (isNaN(choice) || choice < 1 || choice > handleReply.pets.length) {
    return api.sendMessage("❌ Invalid choice.", threadID, messageID);
  }

  const pet = handleReply.pets[choice - 1];

  getBalance(senderID, (balance) => {
    if (balance < pet.price) 
      return api.sendMessage("⚠️ Not enough coins.", threadID, messageID);

    setBalance(senderID, balance - pet.price, () => {
      api.sendMessage(`🎉 You redeemed ${pet.pet_name} for ${pet.price} coins!`, threadID, messageID);

      // Notify admin privately
      api.sendMessage(
        `📩 User ${senderID} redeemed "${pet.pet_name}" for ${pet.price} coins.`,
        BOT_ADMIN
      );
    });
  });
};
