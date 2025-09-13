module.exports.config = {
  name: "autogreet",
  version: "1.1.5",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Automatically greets groups depending on the time of day",
  commandCategory: "system",
  usages: "This runs automatically (no command needed)",
  cooldowns: 0
};

const greetings = [
  { hour: 6, msg: "🌅 Good morning everyone!" },
  { hour: 12, msg: "☀️ Good afternoon, stay productive!" },
  { hour: 18, msg: "🌇 Good evening, hope you had a great day!" },
  { hour: 22, msg: "🌙 Good night, rest well!" }
];

let autoGreetInterval = null;
let lastSentKey = null;

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function getTimeInKolkata() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60000;
  const istDate = new Date(utc + istOffset);
  return { hour: istDate.getHours(), minute: istDate.getMinutes() };
}

// 🔹 Run command (optional, won’t error if you type /autogreet)
module.exports.run = async function ({ api, event }) {
  return api.sendMessage(
    "✅ Auto-greet is active. Greetings will be sent at 6AM, 12PM, 6PM, and 10PM IST.",
    event.threadID
  );
};

// 🔹 Safe autostart
module.exports.onLoad = function ({ api }) {
  console.log("✅ Auto-greet loaded.");

  if (autoGreetInterval) return; // don’t start twice

  autoGreetInterval = setInterval(async () => {
    try {
      const { hour, minute } = getTimeInKolkata();
      if (minute !== 0) return;

      const greet = greetings.find(g => g.hour === hour);
      if (!greet) return;

      const currentKey = `${hour}:${minute}`;
      if (lastSentKey === currentKey) return;

      let threads = [];
      try {
        threads = await api.getThreadList(50, null, ["INBOX"]);
      } catch (err) {
        return console.error("⚠️ Could not fetch thread list:", err.message);
      }

      const groups = threads.filter(t => t.isGroup);
      for (const g of groups) {
        api.sendMessage(greet.msg, g.threadID, (err) => {
          if (err) console.error(`❌ Failed to greet ${g.threadID}:`, err.message);
        });
        await sleep(500);
      }

      lastSentKey = currentKey;
      console.log(`✅ Sent greeting: "${greet.msg}"`);
    } catch (err) {
      console.error("❌ Auto-greet crash prevented:", err.message);
    }
  }, 30 * 1000);
};

module.exports.onUnload = function () {
  if (autoGreetInterval) {
    clearInterval(autoGreetInterval);
    autoGreetInterval = null;
  }
  console.log("✅ Auto-greet stopped.");
};
