module.exports.config = {
  name: "help",
  version: "2.0.2",
  hasPermssion: 0,
  credits: "Edited by ChatGPT",
  description: "Custom Help Command (only selected commands shown)",
  commandCategory: "system",
  usages: "/help",
  cooldowns: 1
};

module.exports.run = function ({ api, event }) {
  const { threadID } = event;

  // Unicode Bold Commands
  const helpMenu = `
📖 𝗕𝗢𝗧 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦 𝗚𝗨𝗜𝗗𝗘

💰 /𝗕𝗔𝗡𝗞
📌 Tingnan ang iyong balance, magdeposito o magwithdraw ng coins.
📝 Example: /bank deposit 100

📦 /𝗦𝗛𝗢𝗣
📌 Maglagay ng item para i-auto post sa lahat ng GC kada 20 minutes (20 coins bawat post).
📝 Example: /shop iPhone 14 Pro Max 1000gcash
📝 Example: /shop list
📝 Example: /shop remove

🎯 /𝗕𝗜𝗗
📌 Gumawa ng bidding system para sa items.
📝 Example: /bid start raccoon 50
📝 Example: /bid end

📊 /𝗦𝗧𝗢𝗖𝗞
📌 Tingnan o i-manage ang stock ng items.
📝 Example: /stock add raccoon 10
📝 Example: /stock list

🔍 /𝗖𝗛𝗘𝗖𝗞
📌 I-check ang profile o info ng isang user.
📝 Example: /check @mention

🐾 /𝗣𝗘𝗧𝗖𝗔𝗟𝗖
📌 Pet calculator para sa stats at growth.
📝 Example: /petcalc raccoon

🤖 /𝗝𝗔𝗡𝗗𝗘𝗟
📌 Info tungkol kay Jandel at commands.
📝 Example: /jandel

🧠 /𝗚𝗣𝗧
📌 Makipag-usap sa AI assistant.
📝 Example: /gpt gumawa ka ng tula

🚨 /𝗦𝗖𝗔𝗠𝗠𝗘𝗥
📌 Tingnan ang scammer list ng GC.
📝 Example: /scammer add @mention
📝 Example: /scammer list

📜 /𝗥𝗨𝗟𝗘𝗦
📌 Ipakita ang rules ng GC at ng bot.
📝 Example: /rules

🎰 /𝗦𝗟𝗢𝗧
📌 Subukan ang iyong swerte sa slot game.
📝 Example: /slot 100

👢 /𝗞𝗜𝗖𝗞
📌 I-kick ang member gamit mention.
📝 Example: /kick @mention

━━━━━━━━━━━━━━━
✨ Gumamit ng /help <command> para makita ulit ang usage.
`;

  return api.sendMessage(helpMenu, threadID);
};
