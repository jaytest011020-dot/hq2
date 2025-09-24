const { setData, getData } = require("../../database.js");

// ✅ Owner UID
const OWNER_UID = "61559999326713";

module.exports.config = {
  name: "dailyreward",
  version: "1.1.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Claim daily reward (VIPs only), resets every 12:00 AM",
  commandCategory: "economy",
  usages: "/dailyreward",
  cooldowns: 3
};

module.exports.run = async function({ api, event, Users }) {
  const { senderID, threadID, messageID } = event;

  // 🔹 Check VIP status
  const vips = (await getData("/vip")) || [];
  const isVIP = vips.find(v => v.uid === senderID);
  const isOwner = senderID === OWNER_UID;

  if (!isVIP && !isOwner) {
    return api.sendMessage("❌ Only VIPs can claim daily reward.", threadID, messageID);
  }

  const userBank = (await getData(`bank/${threadID}/${senderID}`)) || { name: await getUserName(senderID, api, Users), balance: 0, lastDailyDate: null };
  const today = new Date();
  const todayString = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;

  if (userBank.lastDailyDate === todayString) {
    return api.sendMessage("❌ You have already claimed your daily reward today.\n⏱ Come back tomorrow after 12:00 AM.", threadID, messageID);
  }

  // 🔹 Reward amount
  const reward = 10000; // You can change the daily reward amount

  userBank.balance += reward;
  userBank.lastDailyDate = todayString;

  await setData(`bank/${threadID}/${senderID}`, userBank);

  return api.sendMessage(`✅ Daily reward claimed!\n💰 You received ${reward.toLocaleString()} coins.\nYour new balance: 💰 ${userBank.balance.toLocaleString()} coins`, threadID, messageID);
};

// 🔑 Helper to get username
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
