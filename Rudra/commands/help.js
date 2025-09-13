module.exports.config = {
  name: "help", // Command is /help
  version: "2.2.1",
  hasPermssion: 0,
  credits: "Edited by ChatGPT",
  description: "Custom Help Command (only selected commands shown)",
  commandCategory: "system",
  usages: "/help",
  cooldowns: 1
};

module.exports.run = function ({ api, event }) {
  const { threadID } = event;

  // Unicode Bold Help Menu
  const helpMenu = `
📖 𝗕𝗢𝗧 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗚𝗨𝗜𝗗𝗘

💰 /𝗕𝗔𝗡𝗞  
📌 Check your balance, deposit, or withdraw coins.  
📝 Example: /bank deposit 100  

📦 /𝗦𝗛𝗢𝗣  
📌 Add an item to auto-post in all GCs every 20 minutes (20 coins per post).  
📝 Example: /shop iPhone 14 Pro Max 1000gcash  
📝 Example: /shop list  
📝 Example: /shop remove  

🎯 /𝗕𝗜𝗗  
📌 Create a bidding system for items.  
📝 Example: /bid start raccoon 50  
📝 Example: /bid end  

📊 /𝗦𝗧𝗢𝗖𝗞  
📌 View or manage item stock.  
📝 Example: /stock add raccoon 10  
📝 Example: /stock list  

🔍 /𝗖𝗛𝗘𝗖𝗞  
📌 Check a user's profile or info.  
📝 Example: /check @mention  

🐾 /𝗣𝗘𝗧𝗖𝗔𝗟𝗖  
📌 Pet calculator for stats and growth.  
📝 Example: /petcalc raccoon  

🤖 /𝗕𝗢𝗧  
📌 Chat with the bot.  
📝 Example: bot hello  

🧠 /𝗚𝗣𝗧  
📌 Chat with the AI assistant.  
📝 Example: /gpt make me a poem  

🚨 /𝗦𝗖𝗔𝗠𝗠𝗘𝗥  
📌 View or update the scammer list of the GC.  
📝 Example: /scammer add @mention  
📝 Example: /scammer list  

📜 /𝗥𝗨𝗟𝗘𝗦  
📌 Show the GC and bot rules.  
📝 Example: /rules  

🎰 /𝗦𝗟𝗢𝗧  
📌 Try your luck with a slot game.  
📝 Example: /slot 100  

👢 /𝗞𝗜𝗖𝗞  
📌 Kick a member using mention.  
📝 Example: /kick @mention  

━━━━━━━━━━━━━━━  
✨ Use /help <command> to see detailed usage.  

👉 𝗝𝗼𝗶𝗻 𝗼𝘂𝗿 𝗕𝘂𝘆 & 𝗦𝗲𝗹𝗹 𝗚𝗖:  
**https://m.me/j/AbYBqABSq7cyHsBk/**
`;

  return api.sendMessage(helpMenu, threadID);
};
