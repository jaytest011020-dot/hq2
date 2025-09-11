const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.sqlite");

// change this to your FB UID (admin)
const BOT_ADMIN = "61559999326713";

module.exports.config = {
  name: "redeem",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "YourName",
  description: "Redeem pets using coins",
  commandCategory: "economy",
  usages: "/redeem | /redeem add/remove/list",
  cooldowns: 2,
};

module.exports.run = async function({ api, event, args }) {
  const userId = event.senderID;

  // Show pets for everyone
  if (!args[0]) {
    db.all("SELECT * FROM redeem", [], (err, rows) => {
      if (err) return api.sendMessage("⚠️ Error loading pets.", event.threadID);

      if (rows.length === 0) {
        return api.sendMessage("No pets available for redeem.", event.threadID);
      }

      let msg = "🐾 Available Pets for Redeem:\n";
      rows.forEach((row, i) => {
        msg += `${i + 1}. ${row.pet_name} - ${row.price} coins\n`;
      });
      msg += "\nReply with the number of the pet you want.";

      api.sendMessage(msg, event.threadID, (err, info) => {
        global.client.handleReply.push({
          name: module.exports.config.name,
          messageID: info.messageID,
          author: event.senderID,
          type: "choosePet",
          data: rows
        });
      });
    });
    return;
  }

  // Admin-only commands
  if (event.senderID !== BOT_ADMIN) {
    return api.sendMessage("❌ This command is for the bot admin only.", event.threadID);
  }

  // /redeem add <pet> <price>
  if (args[0] === "add") {
    const petName = args[1];
    const price = parseInt(args[2]);
    if (!petName || isNaN(price)) {
      return api.sendMessage("Usage: /redeem add <petname> <price>", event.threadID);
    }

    db.run("INSERT INTO redeem (pet_name, price) VALUES (?, ?)", [petName, price], (err) => {
      if (err) return api.sendMessage("⚠️ Failed to add pet.", event.threadID);
      api.sendMessage(`✅ Pet "${petName}" added with price ${price} coins.`, event.threadID);
    });
  }

  // /redeem remove <pet>
  else if (args[0] === "remove") {
    const petName = args[1];
    if (!petName) {
      return api.sendMessage("Usage: /redeem remove <petname>", event.threadID);
    }

    db.run("DELETE FROM redeem WHERE pet_name = ?", [petName], function(err) {
      if (err) return api.sendMessage("⚠️ Failed to remove pet.", event.threadID);
      if (this.changes === 0) {
        return api.sendMessage(`❌ Pet "${petName}" not found.`, event.threadID);
      }
      api.sendMessage(`✅ Pet "${petName}" removed from redeem list.`, event.threadID);
    });
  }

  // /redeem list
  else if (args[0] === "list") {
    db.all("SELECT * FROM redeem", [], (err, rows) => {
      if (err) return api.sendMessage("⚠️ Error loading pets.", event.threadID);
      if (rows.length === 0) return api.sendMessage("No pets available.", event.threadID);

      let msg = "📋 Pet List:\n";
      rows.forEach((row, i) => {
        msg += `${i + 1}. ${row.pet_name} - ${row.price} coins\n`;
      });
      api.sendMessage(msg, event.threadID);
    });
  }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
  const choice = parseInt(event.body);
  if (isNaN(choice) || choice < 1 || choice > handleReply.data.length) {
    return api.sendMessage("Invalid choice.", event.threadID);
  }

  const pet = handleReply.data[choice - 1];
  const userId = event.senderID;

  db.get("SELECT balance FROM bank WHERE user_id = ?", [userId], (err, row) => {
    if (err) return api.sendMessage("⚠️ Error checking balance.", event.threadID);

    if (!row || row.balance < pet.price) {
      return api.sendMessage("❌ Not enough coins.", event.threadID);
    }

    // Deduct coins
    db.run("UPDATE bank SET balance = balance - ? WHERE user_id = ?", [pet.price, userId], (err2) => {
      if (err2) return api.sendMessage("⚠️ Error deducting coins.", event.threadID);

      api.sendMessage(`🎉 You redeemed a ${pet.pet_name} for ${pet.price} coins!`, event.threadID);

      // Notify ONLY bot admin
      api.getUserInfo(userId, (err3, data) => {
        const userName = data && data[userId]?.name ? data[userId].name : userId;
        api.sendMessage(
          `📢 ${userName} (ID: ${userId}) redeemed ${pet.pet_name} for ${pet.price} coins.`,
          BOT_ADMIN
        );
      });
    });
  });
};
