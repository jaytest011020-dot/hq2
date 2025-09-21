const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "redeem",
  version: "1.0.0",
  hasPermission: 0,
  description: "Redeem global codes for coins",
  usages: "/redeem <CODE>",
  commandCategory: "economy",
  cooldowns: 3,
};

// Gumamit ng same getUserName function as bank
async function getUserName(uid, api, Users) {
  let cachedName = global.data.userName.get(uid);
  if (cachedName) return cachedName;

  try {
    const userInfo = await api.getUserInfo(uid);
    const name = Object.values(userInfo)[0]?.name || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch (err) {}

  try {
    const name = await Users.getName(uid) || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch (err) {}

  const fallbackName = `FB-User(${uid})`;
  global.data.userName.set(uid, fallbackName);
  return fallbackName;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;
  if (!args[0]) return api.sendMessage("❌ Please provide a redeem code.", threadID, messageID);

  const code = args[0].toUpperCase();
  let codes = (await getData("redeem/codes")) || {};

  if (!codes[code]) {
    return api.sendMessage("❌ Invalid or expired code.", threadID, messageID);
  }

  const codeData = codes[code];

  // Already redeemed?
  if (codeData.redeemed.includes(senderID)) {
    return api.sendMessage("❌ You already redeemed this code.", threadID, messageID);
  }

  // Expiration check
  if (codeData.expires && Date.now() > codeData.expires) {
    return api.sendMessage("❌ This code has expired.", threadID, messageID);
  }

  // Get user balance (per GC)
  const freshName = await getUserName(senderID, api, Users);
  let bankData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };

  bankData.balance += codeData.coins;
  bankData.name = freshName;

  await setData(`bank/${threadID}/${senderID}`, bankData);

  // Mark as redeemed
  codeData.redeemed.push(senderID);
  codes[code] = codeData;
  await setData("redeem/codes", codes);

  return api.sendMessage(
    `🎉 Congrats ${bankData.name}!\n` +
    `💰 You received ${codeData.coins.toLocaleString()} coins!\n` +
    `🏦 Your new balance in this GC: ${bankData.balance.toLocaleString()} coins`,
    threadID,
    messageID
  );
};
