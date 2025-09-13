module.exports.config = {
  name: "rules",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Rules for the GC and jandel",
  commandCategory: "system",
  usages: "/rules",
  cooldowns: 1
};

module.exports.run = function ({ api, event }) {
  const { threadID } = event;

  const rulesText = `
📜 𝗚𝗖 𝗔𝗡𝗗 𝗝𝗔𝗡𝗗𝗘𝗟 𝗥𝗨𝗟𝗘𝗦

1️⃣ Bawal ang pang-iinsulto o pambabastos sa kapwa.  
2️⃣ Walang spamming ng messages o commands.  
3️⃣ Bawal ang scam, lagay sa /scammer ang napatunayang manloloko.  
4️⃣ Gumamit ng commands ng maayos (/help para makita ang list).  
5️⃣ Respeto sa mga admin at members.  
6️⃣ Ang jandel ay ginawa para makatulong at pampasaya, wag abusuhin.  

━━━━━━━━━━━━━━━  
🔗 𝗝𝗢𝗜𝗡 𝗢𝗨𝗥 𝗚𝗔𝗚 𝗕𝗨𝗬 𝗔𝗡𝗗 𝗦𝗘𝗟𝗟 𝗚𝗖  
👉 https://m.me/j/AbYBqABSq7cyHsBk/
`;

  return api.sendMessage(rulesText, threadID);
};
